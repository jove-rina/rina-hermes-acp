/**
 * Step 5: extract auxiliary messages, chat search, UI message handlers.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const chatAppPath = path.join(root, 'media', 'src', 'chat-app.js');

const lines = fs.readFileSync(chatAppPath, 'utf-8').split(/\r?\n/);

function removeLineRange(start, end) {
    for (let i = start; i <= end; i++) {
        delete lines[i - 1];
    }
}

// 1-based inclusive (current chat-app.js before split)
removeLineRange(1104, 1322); // tool state + auxiliary functions
removeLineRange(1595, 1762); // chat search
removeLineRange(2304, 2316); // clearAllToolLive + setAuxMessageLive (post-removal line nums approximate)

// Re-read filtered and fix second removal by content
let body = lines.filter((l) => l !== undefined).join('\n');

// Remove clearAllToolLive/setAuxMessageLive if still present
body = body.replace(/\n    function clearAllToolLive\(\) \{[\s\S]*?\n    \}\n\n    function setAuxMessageLive[\s\S]*?\n    \}\n\n    function finalizeAssistantBubble/, '\n    function finalizeAssistantBubble');

// Remove chat search event listener block
body = body.replace(
    /\n    if \(chatSearchInput\) \{\n        chatSearchInput\.addEventListener\('input', scheduleChatSearch\);[\s\S]*?\n    if \(chatSearchNext\) \{\n        chatSearchNext\.addEventListener\('click', function\(\) \{ gotoChatSearchMatch\(1\); \}\);\n    \}\n/,
    '\n',
);

// Remove entire switch, keep listener shell
body = body.replace(
    /\n        switch \(msg\.type\) \{[\s\S]*?\n        \}\n    \}\);/,
    '\n    });',
);

const extraImports = `import { createAuxiliaryMessages } from './messages/auxiliary.js';
import { createChatSearch } from './search/chat-search.js';
import { createUiHandlers } from './bridge/handlers/ui.js';
`;

body = body.replace(
    "import { createMessageHandlers } from './bridge/handlers/messages.js';",
    "import { createMessageHandlers } from './bridge/handlers/messages.js';\n" + extraImports,
);

body = body.replace(
    /        document\.querySelectorAll\('\.message-group\.thought, \.message-group\.tool'\)\.forEach\(function\(group\) \{[\s\S]*?        \}\);\n    \}/,
    '        auxiliary.refreshAllAuxiliaryLocale();\n    }',
);

// Symbol replacements (order matters for compound names)
const replacements = [
    [/chatSearchState\.query/g, 'chatSearch.hasQuery()'],
    [/\bscheduleChatSearch\b/g, 'chatSearch.scheduleChatSearch'],
    [/\bclearChatSearch\b/g, 'chatSearch.clearChatSearch'],
    [/\bgotoChatSearchMatch\b/g, 'chatSearch.gotoChatSearchMatch'],
    [/\bbuildAuxiliaryMessage\b/g, 'auxiliary.buildAuxiliaryMessage'],
    [/\bwireAuxiliaryMessage\b/g, 'auxiliary.wireAuxiliaryMessage'],
    [/\bsetAuxiliaryContent\b/g, 'auxiliary.setAuxiliaryContent'],
    [/\bsyncAuxiliaryDetailView\b/g, 'auxiliary.syncAuxiliaryDetailView'],
    [/\bresetToolAggregation\b/g, 'auxiliary.resetToolAggregation'],
    [/\bclearAllToolLive\b/g, 'auxiliary.clearAllToolLive'],
    [/\bsetAuxMessageLive\b/g, 'auxiliary.setAuxMessageLive'],
    [/\bfinalizeAuxiliaryBubble\b/g, 'auxiliary.finalizeAuxiliaryBubble'],
    [/\bhandleToolMessage\b/g, 'auxiliary.handleToolMessage'],
    [/toolCallMap = \{\}/g, 'auxiliary.clearToolState()'],
];

for (const [re, rep] of replacements) {
    body = body.replace(re, rep);
}

// Fix finalizeAssistantBubble - setAuxMessageLive was over-replaced in deps init - careful
// Fix message handler deps that shouldn't use auxiliary prefix on property names
body = body.replace(/auxiliary\.auxiliary\./g, 'auxiliary.');

const factoryInit = `
    let auxiliary;
    let chatSearch;

    auxiliary = createAuxiliaryMessages({
        getLocale: () => locale,
        setupContentBlocks: (...args) => setupContentBlocks(...args),
        processFileRefs,
        maybeScrollToBottom,
        get addMessage() { return addMessage; },
        get finalizeAssistantBubble() { return finalizeAssistantBubble; },
        enableStopAfterAgentOutput,
    });
    chatSearch = createChatSearch({
        getMessagePlainText,
    });
    chatSearch.bindChatSearchEvents();

`;

body = body.replace(/\n    const permissions = createPermissions/, factoryInit + '\n    const permissions = createPermissions');

// Update permissions deps - finalizeAssistantBubble reference stays

body = body.replace(
    `        ...createMessageHandlers({
            isMessageForActiveSession,
            addMessage,
            handleToolMessage,
            getThoughtMsgId: () => thoughtMsgId,
            setThoughtMsgId: (id) => { thoughtMsgId = id; },
            setAuxiliaryContent,
            setAuxMessageLive,
            maybeScrollToBottom,`,
    `        ...createMessageHandlers({
            isMessageForActiveSession,
            addMessage,
            handleToolMessage: auxiliary.handleToolMessage,
            getThoughtMsgId: () => thoughtMsgId,
            setThoughtMsgId: (id) => { thoughtMsgId = id; },
            setAuxiliaryContent: auxiliary.setAuxiliaryContent,
            setAuxMessageLive: auxiliary.setAuxMessageLive,
            maybeScrollToBottom,`,
);

body = body.replace(
    `        ...createSimpleHandlers({`,
    `        ...createUiHandlers({
            isMessageForActiveSession,
            setConnectionAttempted: (v) => { connectionAttempted = v; },
            updateStatus,
            setIsPrompting: (v) => { isPrompting = v; },
            setAwaitingFirstChunk: (v) => { awaitingFirstChunk = v; },
            resetToolAggregation: auxiliary.resetToolAggregation,
            finishStreaming,
            setCanSend: (v) => { canSend = v; },
            inputEl,
            setInputMode,
            placeholder,
            scheduleSessionMarkdownRender,
            maybeFocusInputAfterResponse,
            getAwaitingFirstChunk: () => awaitingFirstChunk,
            resetAutoScrollFollow,
            updateTokenUsage,
            getLocale: () => locale,
            buildConnectionErrorPlaceholder,
            bindConnectionErrorActions,
            setLocale,
            refreshLocale: () => { locale = getLocale(); applyLocale(); },
            getLastSessions: () => lastSessions,
            getLastActiveSessionId: () => lastActiveSessionId,
            renderSessionTabs,
            LOCAL_HISTORY_DIVIDER_ID,
            copyToClipboard,
            downloadSessionMarkdown,
            renderProfileList,
            renderModelList,
            appendLog: (line, level) => {
                logs.push({ line, level });
                if (logs.length > 500) logs = logs.slice(-500);
                if (isLogModalOpen()) renderLogContent();
            },
            setPluginInfo: (msg) => { pluginInfo = msg; },
            renderAboutContent,
            getFilePickerRequestId: () => filePickerEl.dataset.requestId,
            renderFilePickerItems,
            previewRequests,
            showFilePreview,
            positionFilePreview,
            showContextAttachPicker,
            hideContextAttachPicker,
            insertLocalHistoryDivider,
        }),
        ...createSimpleHandlers({`,
);

fs.writeFileSync(chatAppPath, body);
console.log('Step 5 applied.');
