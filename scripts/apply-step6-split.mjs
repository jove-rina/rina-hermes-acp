/**
 * Step 6: extract session-render, file-refs, add-message, context-attach.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = path.join(root, 'media', 'src');
const chatAppPath = path.join(src, 'chat-app.js');

const lines = fs.readFileSync(chatAppPath, 'utf-8').split(/\r?\n/);

function slice(start, end) {
    return lines
        .slice(start - 1, end)
        .map((line) => (line.startsWith('    ') ? line.slice(4) : line))
        .join('\n');
}

function w(rel, content) {
    const p = path.join(src, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content.trimStart() + '\n');
}

// --- context-attach module ---
let contextBody = slice(379, 1020);
contextBody = contextBody.replace(/\blocale\b/g, 'deps.getLocale()');
contextBody = contextBody.replace(/multiSelectPurpose/g, 'deps.getMultiSelectPurpose()');
contextBody = contextBody.replace(/multiSelectMode/g, 'deps.getMultiSelectMode()');
contextBody = contextBody.replace(/\bexitMultiSelectMode\b/g, 'deps.exitMultiSelectMode');
contextBody = contextBody.replace(/\benterMultiSelectMode\b/g, 'deps.enterMultiSelectMode');
contextBody = contextBody.replace(/\bgetSelectedMessageIndices\b/g, 'deps.getSelectedMessageIndices');
contextBody = contextBody.replace(/\bsetGroupSelected\b/g, 'deps.setGroupSelected');
contextBody = contextBody.replace(/\bsetGroupsSelected\b/g, 'deps.setGroupsSelected');
contextBody = contextBody.replace(/\bwireSelectableGroup\b/g, 'deps.wireSelectableGroup');
contextBody = contextBody.replace(/\bcloseAllDropdowns\b/g, 'deps.closeAllDropdowns');

w(
    'context-attach/index.js',
    `import {
    messagesEl,
    LOCAL_HISTORY_DIVIDER_ID,
    contextAttachPicker,
    contextAttachBtn,
    contextAttachLabel,
    contextAttachDropdown,
    contextAttachList,
    contextAttachHelp,
    contextAttachTooltipEl,
    contextAttachPreviewEl,
    contextAttachPreviewList,
    contextAttachSendModal,
} from '../core/dom-refs.js';
import { showModal, hideModal } from '../ui/modal.js';

/** @param {Record<string, Function>} deps */
export function createContextAttach(deps) {
    let contextAttachVisible = false;
    let contextAttachMode = 'none';
    let contextAttachCustomIndices = [];
    let contextAttachCustomPending = false;
    let contextAttachCustomConfirmed = false;
    let contextAttachUnconfirmedIndices = [];
    let contextAttachPreviewOpen = false;
    let contextAttachPickerHiding = false;
    let contextAttachHasChoice = false;
    let pendingSendText = '';

${contextBody}

    function bindContextAttachEvents() {
        bindContextAttachTooltip();
        bindContextAttachPreview();
        const yesBtn = document.getElementById('contextAttachSendYesBtn');
        const noBtn = document.getElementById('contextAttachSendNoBtn');
        if (yesBtn) {
            yesBtn.addEventListener('click', function() {
                const text = pendingSendText;
                if (!text) { closeContextAttachSendModal(); return; }
                finalizeContextAttachSelectionFromPending();
                closeContextAttachSendModal();
                deps.executeSendMessage(text, buildContextAttachPayload(false));
            });
        }
        if (noBtn) {
            noBtn.addEventListener('click', function() {
                const text = pendingSendText;
                closeContextAttachSendModal();
                if (text) deps.executeSendMessage(text, { mode: 'none' });
            });
        }
        if (contextAttachBtn && contextAttachDropdown) {
            contextAttachBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const open = contextAttachDropdown.style.display === 'none';
                deps.closeAllDropdowns();
                if (open) {
                    contextAttachPicker.classList.add('is-open');
                    contextAttachDropdown.style.display = 'block';
                    renderContextAttachOptions();
                }
            });
            contextAttachDropdown.addEventListener('click', function(e) { e.stopPropagation(); });
        }
    }

    return {
        showContextAttachPicker,
        hideContextAttachPicker,
        forceHideContextAttachPicker,
        hideContextAttachTooltip,
        hideContextAttachPreview,
        isInsideContextAttachPreview,
        updateContextAttachButtonLabel,
        confirmContextAttachSelection,
        hasUnconfirmedCustomMemorySelection,
        openContextAttachSendModal,
        closeContextAttachSendModal,
        buildContextAttachPayload,
        finalizeContextAttachSelectionFromPending,
        bindContextAttachEvents,
    };
}
`,
);

// dom-refs
const domRefsPath = path.join(src, 'core', 'dom-refs.js');
let domRefs = fs.readFileSync(domRefsPath, 'utf-8');
if (!domRefs.includes('contextAttachPicker')) {
    domRefs = domRefs.replace(
        "export const tabContextMenu = document.getElementById('tabContextMenu');",
        `export const tabContextMenu = document.getElementById('tabContextMenu');
export const filePickerEl = document.getElementById('filePicker');
export const contextAttachPicker = document.getElementById('contextAttachPicker');
export const contextAttachBtn = document.getElementById('contextAttachBtn');
export const contextAttachLabel = document.getElementById('contextAttachLabel');
export const contextAttachDropdown = document.getElementById('contextAttachDropdown');
export const contextAttachList = document.getElementById('contextAttachList');
export const contextAttachHelp = document.getElementById('contextAttachHelp');
export const contextAttachHeaderLead = document.getElementById('contextAttachHeaderLead');
export const contextAttachHeaderRest = document.getElementById('contextAttachHeaderRest');
export const contextAttachTooltipEl = document.getElementById('contextAttachTooltip');
export const contextAttachPreviewEl = document.getElementById('contextAttachPreview');
export const contextAttachPreviewList = document.getElementById('contextAttachPreviewList');
export const contextAttachSendModal = document.getElementById('contextAttachSendModal');`,
    );
    fs.writeFileSync(domRefsPath, domRefs);
}

const removeSet = new Set();
for (const [s, e] of [
    [355, 364],
    [379, 1020],
    [1597, 1700],
    [1758, 1954],
    [1993, 2181],
    [1331, 1342],
]) {
    for (let i = s; i <= e; i++) removeSet.add(i);
}

let body = lines.filter((_, idx) => !removeSet.has(idx + 1)).join('\n');

const extraImports = `import { createSessionRender } from './messages/session-render.js';
import { createFileRefs } from './input/file-refs.js';
import { createAddMessage } from './messages/add-message.js';
import { createContextAttach } from './context-attach/index.js';
`;

body = body.replace(
    "import { createUiHandlers } from './bridge/handlers/ui.js';",
    "import { createUiHandlers } from './bridge/handlers/ui.js';\n" + extraImports,
);

body = body.replace(
    'tabContextMenu,\n    SESSION_RENDER_BANNER_ID,',
    `tabContextMenu,
    filePickerEl,
    contextAttachPicker,
    contextAttachBtn,
    contextAttachLabel,
    contextAttachDropdown,
    contextAttachList,
    contextAttachHelp,
    contextAttachHeaderLead,
    contextAttachHeaderRest,
    contextAttachTooltipEl,
    contextAttachPreviewEl,
    contextAttachPreviewList,
    contextAttachSendModal,
    SESSION_RENDER_BANNER_ID,`,
);

// Remove duplicate local DOM refs for context attach / file picker
body = body.replace(/\n    const filePickerEl = document\.getElementById\('filePicker'\);\n    let mentionStart[\s\S]*?const previewRequests = new Map\(\);\n/, '\n');
body = body.replace(/\n    const contextAttachPicker = document\.getElementById\('contextAttachPicker'\);[\s\S]*?const switchSessionModal = document\.getElementById\('switchSessionModal'\);\n/, '\n    const switchSessionModal = document.getElementById(\'switchSessionModal\');\n');

// Remove old context attach event bindings (moved to bindContextAttachEvents)
body = body.replace(
    /\n    if \(contextAttachBtn && contextAttachDropdown\) \{[\s\S]*?contextAttachDropdown\.addEventListener\('click', function\(e\) \{ e\.stopPropagation\(\); \}\);\n    \}\n/,
    '\n',
);
body = body.replace(
    /\n    bindContextAttachTooltip\(\);\n    bindContextAttachPreview\(\);\n    const contextAttachSendYesBtn[\s\S]*?executeSendMessage\(text, \{ mode: 'none' \}\);\n        \}\);\n    \}\n/,
    '\n',
);

// Remove file picker input handlers (moved to fileRefs.bindFilePickerInputHandlers)
body = body.replace(
    /\n    \/\/ Auto-resize \+ @file mention\n    inputEl\.addEventListener\('input', function\(\) \{[\s\S]*?updateQuickActionBtns\(\);\n    \}\);\n\n    \/\/ Enter to send[\s\S]*?if \(e\.key === 'Enter' && !e\.shiftKey\) \{\n            e\.preventDefault\(\);\n            sendMessage\(\);\n        \}\n    \}\);\n/,
    `\n    fileRefs.bindFilePickerInputHandlers();
    inputEl.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && multiSelectMode) {
            e.preventDefault();
            exitMultiSelectMode();
            return;
        }
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

`,
);

// closeAllDropdowns references
body = body.replace(
    /function closeAllDropdowns\(\) \{[\s\S]*?hideContextAttachPreview\(\);\n    \}/,
    `function closeAllDropdowns() {
        profilePicker.classList.remove('is-open');
        modelPicker.classList.remove('is-open');
        if (contextAttachPicker) contextAttachPicker.classList.remove('is-open');
        profileDropdown.style.display = 'none';
        modelDropdown.style.display = 'none';
        if (contextAttachDropdown) contextAttachDropdown.style.display = 'none';
        contextAttach.hideContextAttachTooltip();
        contextAttach.hideContextAttachPreview();
    }`,
);

// scroll listener
body = body.replace(
    `        hideContextAttachTooltip();
        if (contextAttachPreviewOpen && isInsideContextAttachPreview(e.target)) {
            return;
        }
        hideContextAttachPreview();`,
    `        contextAttach.hideContextAttachTooltip();
        if (contextAttachPreviewOpen && contextAttach.isInsideContextAttachPreview(e.target)) {
            return;
        }
        contextAttach.hideContextAttachPreview();`,
);

// Factory init before permissions
const factoryInit = `
    let sessionRender;
    let fileRefs;
    let messages;
    let contextAttach;

    fileRefs = createFileRefs({
        filePickerEl,
        getLocale: () => locale,
        syncInputHeightFromContent,
        updateQuickActionBtns,
    });

    messages = createAddMessage({
        getLocale: () => locale,
        placeholder,
        getStreamingMessageId: () => streamingMessageId,
        setStreamingMessageId: (v) => { streamingMessageId = v; },
        getThoughtMsgId: () => thoughtMsgId,
        setThoughtMsgId: (v) => { thoughtMsgId = v; },
        chatSearchHasQuery: () => chatSearch.hasQuery(),
        scheduleChatSearch: () => chatSearch.scheduleChatSearch(),
        maybeScrollToBottom,
        isSelectableRole,
        setGroupSelected,
        wireSelectableGroup,
        assignSessionIndex,
        buildAuxiliaryMessage: (...a) => auxiliary.buildAuxiliaryMessage(...a),
        wireAuxiliaryMessage: (...a) => auxiliary.wireAuxiliaryMessage(...a),
        resetToolAggregation: () => auxiliary.resetToolAggregation(),
        clearAllToolLive: () => auxiliary.clearAllToolLive(),
        enableStopAfterAgentOutput: () => messages.enableStopAfterAgentOutput(),
        processFileRefs: (...a) => fileRefs.processFileRefs(...a),
        setupContentBlocks: (...a) => setupContentBlocks(...a),
        setAuxMessageLive: (...a) => auxiliary.setAuxMessageLive(...a),
        finalizeAuxiliaryBubble: (...a) => auxiliary.finalizeAuxiliaryBubble(...a),
        enterMultiSelectMode,
        updateQuickActionBtns,
        getAwaitingFirstChunk: () => awaitingFirstChunk,
        setAwaitingFirstChunk: (v) => { awaitingFirstChunk = v; },
        getIsPrompting: () => isPrompting,
        getCanSend: () => canSend,
        setInputMode,
    });

    sessionRender = createSessionRender({
        getLocale: () => locale,
        setupContentBlocks: (...a) => setupContentBlocks(...a),
        processFileRefs: (...a) => fileRefs.processFileRefs(...a),
        setAuxiliaryContent: (...a) => auxiliary.setAuxiliaryContent(...a),
        chatSearchHasQuery: () => chatSearch.hasQuery(),
        scheduleChatSearch: () => chatSearch.scheduleChatSearch(),
    });

    contextAttach = createContextAttach({
        getLocale: () => locale,
        getMultiSelectPurpose: () => multiSelectPurpose,
        getMultiSelectMode: () => multiSelectMode,
        exitMultiSelectMode,
        enterMultiSelectMode,
        getSelectedMessageIndices,
        setGroupSelected,
        setGroupsSelected,
        wireSelectableGroup,
        closeAllDropdowns,
        executeSendMessage,
    });
    contextAttach.bindContextAttachEvents();

    const {
        getMessagePlainText,
        addMessage,
        finalizeAssistantBubble,
        enableStopAfterAgentOutput,
        finishStreaming,
    } = messages;

`;

body = body.replace(/\n    let auxiliary;\n    let chatSearch;\n\n    auxiliary = createAuxiliaryMessages/, factoryInit + '\n    let auxiliary;\n    let chatSearch;\n\n    auxiliary = createAuxiliaryMessages');

// Wire ui handlers deps
body = body.replace('previewRequests,', 'previewRequests: fileRefs.previewRequests,');
body = body.replace('getFilePickerRequestId: () => filePickerEl.dataset.requestId,', 'getFilePickerRequestId: () => fileRefs.getFilePickerRequestId(),');
body = body.replace('renderFilePickerItems,', 'renderFilePickerItems: fileRefs.renderFilePickerItems,');
body = body.replace('showFilePreview,', 'showFilePreview: fileRefs.showFilePreview,');
body = body.replace('positionFilePreview,', 'positionFilePreview: fileRefs.positionFilePreview,');
body = body.replace('showContextAttachPicker,', 'showContextAttachPicker: contextAttach.showContextAttachPicker,');
body = body.replace('hideContextAttachPicker,', 'hideContextAttachPicker: contextAttach.hideContextAttachPicker,');
body = body.replace('scheduleSessionMarkdownRender,', 'scheduleSessionMarkdownRender: sessionRender.scheduleSessionMarkdownRender,');

// multi-select references
body = body.replace(/\bupdateContextAttachButtonLabel\b/g, 'contextAttach.updateContextAttachButtonLabel');
body = body.replace(/\bconfirmContextAttachSelection\b/g, 'contextAttach.confirmContextAttachSelection');
body = body.replace(/\bforceHideContextAttachPicker\b/g, 'contextAttach.forceHideContextAttachPicker');
body = body.replace(/\bcancelSessionMarkdownRender\b/g, 'sessionRender.cancelSessionMarkdownRender');
body = body.replace(/\bscheduleSessionMarkdownRender\b(\(\))/g, 'sessionRender.scheduleSessionMarkdownRender()');
body = body.replace(/\bhideFilePicker\b/g, 'fileRefs.hideFilePicker');

// sendMessage deps
body = body.replace(/\bhasUnconfirmedCustomMemorySelection\b/g, 'contextAttach.hasUnconfirmedCustomMemorySelection');
body = body.replace(/\bopenContextAttachSendModal\b/g, 'contextAttach.openContextAttachSendModal');

// chatSearch in addMessage was already using chatSearch - messages factory uses it

// hide file picker in document click
body = body.replace(/\bhideFilePicker\(\)/g, 'fileRefs.hideFilePicker()');

// executeSendMessage uses addMessage, processFileRefs via fileRefs
body = body.replace(
    /function executeSendMessage\(text, attachOverride\) \{[\s\S]*?\n    \}\n\n    function openSwitchSessionModal/,
    `function executeSendMessage(text, attachOverride) {
        fileRefs.hideFilePicker();
        resetAutoScrollFollow();
        addMessage('user', text);
        inputEl.value = '';
        syncInputHeightFromContent();
        updateQuickActionBtns();
        inputEl.disabled = true;
        awaitingFirstChunk = true;
        setInputMode('waiting');

        const payload = attachOverride !== undefined
            ? attachOverride
            : contextAttach.buildContextAttachPayload(false);
        vscode.postMessage({
            type: 'sendMessage',
            text: text,
            contextAttach: payload,
        });
    }

    function openSwitchSessionModal`,
);

// appendToInput/insertIntoInput hideFilePicker
body = body.replace(/hideFilePicker\(\)/g, 'fileRefs.hideFilePicker()');

fs.writeFileSync(chatAppPath, body);
console.log('Step 6 applied.');
