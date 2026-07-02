/**
 * Step 7: extract log, multi-select, send, switch-modal, pickers; wire factories.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const chatAppPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', 'media', 'src', 'chat-app.js');
const lines = fs.readFileSync(chatAppPath, 'utf-8').split(/\r?\n/);

const removeSet = new Set();
for (const [s, e] of [
    [370, 370], // pendingSwitchSessionId
    [385, 433], // executeSendMessage + switch session
    [472, 497], // setInputMode
    [571, 708], // log viewer
    [751, 906], // multi-select helpers (keep isSelectableRole)
    [949, 1003], // getSelectedMessageIndices + delete/export selected
    [1113, 1139], // sendMessage + keydown + sendBtn (keep fileRefs.bind below)
    [1153, 1195], // multi-select toolbar events
    [1315, 1542], // pickers + switch session events + duplicate context-attach
    [1396, 1434], // duplicate context-attach (subset of above, idempotent)
]) {
    for (let i = s; i <= e; i++) removeSet.add(i);
}

let body = lines.filter((_, idx) => !removeSet.has(idx + 1)).join('\n');

const extraImports = `import { createLogViewer } from './log/viewer.js';
import { createSend, createInputMode } from './input/send.js';
import { createMultiSelect } from './multi-select/index.js';
import { createSwitchSessionModal } from './sessions/switch-modal.js';
import { createPickers } from './pickers/index.js';
`;

body = body.replace(
    "import { createContextAttach } from './context-attach/index.js';",
    "import { createContextAttach } from './context-attach/index.js';\n" + extraImports,
);

body = body.replace(/fileRefs\.fileRefs(\.fileRefs)*/g, 'fileRefs');

body = body.replace(
    'updateModelButtonDisplay(lastModelPayload);',
    'pickers.refreshModelButtonDisplay();',
);
body = body.replace(
    'renderContextAttachOptions();',
    'contextAttach.renderContextAttachOptions();',
);
body = body.replace(
    'updateMultiSelectToolbar();',
    'multiSelect.updateMultiSelectToolbar();',
);

body = body.replace(
    /\n    fileRefs\.bindFilePickerInputHandlers\(\);\n    inputEl\.addEventListener\('keydown'[\s\S]*?sendBtn\.addEventListener\('click', sendMessage\);\n/,
    '\n',
);

const factoryInit = `
    let logViewer;
    let inputMode;
    let pickers;
    let switchSession;
    let multiSelect;
    let send;
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
    fileRefs.bindFilePickerInputHandlers();

    logViewer = createLogViewer({ getLocale: () => locale });
    logViewer.bindLogViewerEvents();

    inputMode = createInputMode({ getCanSend: () => canSend });
    const setInputMode = inputMode.setInputMode;

    switchSession = createSwitchSessionModal({
        getLocale: () => locale,
        getActiveSessionId: () => activeSessionId,
        getIsPrompting: () => isPrompting,
    });
    switchSession.bindSwitchSessionEvents();
    const requestSwitchSession = switchSession.requestSwitchSession;

    multiSelect = createMultiSelect({
        getLocale: () => locale,
        getMultiSelectMode: () => multiSelectMode,
        setMultiSelectMode: (v) => { multiSelectMode = v; },
        getMultiSelectPurpose: () => multiSelectPurpose,
        setMultiSelectPurpose: (v) => { multiSelectPurpose = v; },
        isAttachableMemoryGroup: (g) => contextAttach.isAttachableMemoryGroup(g),
        hideContextAttachPreview: () => contextAttach.hideContextAttachPreview(),
        updateContextAttachButtonLabel: () => contextAttach.updateContextAttachButtonLabel(),
        clearContextAttachSelectableTargets: () => contextAttach.clearContextAttachSelectableTargets(),
        handleExitMultiSelectAttachMode: (indices) => contextAttach.handleExitMultiSelectAttachMode(indices),
        confirmContextAttachSelection: () => contextAttach.confirmContextAttachSelection(),
        reindexSessionIndices,
        updateQuickActionBtns,
        placeholder,
        requestSessionExport,
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
        setGroupSelected: (...a) => multiSelect.setGroupSelected(...a),
        wireSelectableGroup: (...a) => multiSelect.wireSelectableGroup(...a),
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
        enterMultiSelectMode: (...a) => multiSelect.enterMultiSelectMode(...a),
        updateQuickActionBtns,
        getAwaitingFirstChunk: () => awaitingFirstChunk,
        setAwaitingFirstChunk: (v) => { awaitingFirstChunk = v; },
        getIsPrompting: () => isPrompting,
        getCanSend: () => canSend,
        setInputMode,
    });

    send = createSend({
        hideFilePicker: () => fileRefs.hideFilePicker(),
        addMessage: (...a) => messages.addMessage(...a),
        syncInputHeightFromContent,
        updateQuickActionBtns,
        setAwaitingFirstChunk: (v) => { awaitingFirstChunk = v; },
        setInputMode,
        buildContextAttachPayload: (...a) => contextAttach.buildContextAttachPayload(...a),
        hasUnconfirmedCustomMemorySelection: () => contextAttach.hasUnconfirmedCustomMemorySelection(),
        openContextAttachSendModal: (...a) => contextAttach.openContextAttachSendModal(...a),
        getCanSend: () => canSend,
        getMultiSelectMode: () => multiSelectMode,
        exitMultiSelectMode: () => multiSelect.exitMultiSelectMode(),
    });
    send.bindSendEvents();

    contextAttach = createContextAttach({
        getLocale: () => locale,
        getMultiSelectPurpose: () => multiSelectPurpose,
        getMultiSelectMode: () => multiSelectMode,
        exitMultiSelectMode: () => multiSelect.exitMultiSelectMode(),
        enterMultiSelectMode: (...a) => multiSelect.enterMultiSelectMode(...a),
        getSelectedMessageIndices: (...a) => multiSelect.getSelectedMessageIndices(...a),
        setGroupSelected: (...a) => multiSelect.setGroupSelected(...a),
        setGroupsSelected: (...a) => multiSelect.setGroupsSelected(...a),
        wireSelectableGroup: (...a) => multiSelect.wireSelectableGroup(...a),
        closeAllDropdowns: () => pickers.closeAllDropdowns(),
        executeSendMessage: (...a) => send.executeSendMessage(...a),
    });
    contextAttach.bindContextAttachEvents();

    pickers = createPickers({
        getLocale: () => locale,
        hideFilePicker: () => fileRefs.hideFilePicker(),
        hideContextAttachTooltip: () => contextAttach.hideContextAttachTooltip(),
        hideContextAttachPreview: () => contextAttach.hideContextAttachPreview(),
    });
    pickers.bindPickerEvents();
    multiSelect.bindMultiSelectEvents();

    sessionRender = createSessionRender({
        getLocale: () => locale,
        setupContentBlocks: (...a) => setupContentBlocks(...a),
        processFileRefs: (...a) => fileRefs.processFileRefs(...a),
        setAuxiliaryContent: (...a) => auxiliary.setAuxiliaryContent(...a),
        chatSearchHasQuery: () => chatSearch.hasQuery(),
        scheduleChatSearch: () => chatSearch.scheduleChatSearch(),
    });

    const {
        getMessagePlainText,
        addMessage,
        finalizeAssistantBubble,
        enableStopAfterAgentOutput,
        finishStreaming,
    } = messages;

    const {
        enterMultiSelectMode,
        exitMultiSelectMode,
    } = multiSelect;

`;

body = body.replace(
    /\n    let sessionRender;\n    let fileRefs;\n    let messages;\n    let contextAttach;\n\n    fileRefs = createFileRefs\([\s\S]*?contextAttach\.bindContextAttachEvents\(\);\n\n    const \{\n        getMessagePlainText,/,
    factoryInit,
);

body = body.replace(
    /\n    sessionRender = createSessionRender\(\{[\s\S]*?\n    \}\);\n\n    contextAttach = createContextAttach\(\{[\s\S]*?\n    contextAttach\.bindContextAttachEvents\(\);\n\n    const \{\n        getMessagePlainText,/,
    '',
);

body = body.replace(
    'requestSwitchSession,',
    'requestSwitchSession: switchSession.requestSwitchSession,',
);

body = body.replace(
    'renderProfileList,',
    'renderProfileList: pickers.renderProfileList,',
);
body = body.replace(
    'renderModelList,',
    'renderModelList: pickers.renderModelList,',
);
body = body.replace(
    /appendLog: \(line, level\) => \{[\s\S]*?\},/,
    'appendLog: logViewer.appendLog,',
);
body = body.replace(
    'openLogModal,',
    'openLogModal: logViewer.openLogModal,',
);

fs.writeFileSync(chatAppPath, body);
console.log('Step 7 applied.');
