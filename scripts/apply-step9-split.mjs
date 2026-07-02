/**
 * Step 9: extract apply-locale, token-usage, quick-actions, local-history, chat-reset.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const chatAppPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', 'media', 'src', 'chat-app.js');
const lines = fs.readFileSync(chatAppPath, 'utf-8').split(/\r?\n/);

const removeSet = new Set();
for (const [s, e] of [
    [145, 172],
    [175, 345],
    [388, 409],
    [415, 434],
    [440, 474],
    [478, 545],
    [548, 558],
]) {
    for (let i = s; i <= e; i++) removeSet.add(i);
}

let body = lines.filter((_, idx) => !removeSet.has(idx + 1)).join('\n');

const extraImports = `import { createApplyLocale } from './locale/apply-locale.js';
import { createTokenUsage } from './ui/token-usage.js';
import { createQuickActions } from './input/quick-actions.js';
import { createLocalHistory } from './sessions/local-history.js';
import { createChatReset } from './sessions/chat-reset.js';
`;

body = body.replace(
    "import { createInfoModals } from './ui/info-modals.js';",
    "import { createInfoModals } from './ui/info-modals.js';\n" + extraImports,
);

body = body.replace(
    `    setConfigureEnvDetectDetailsOpen,
    bindConfigureEnvEvents,
} from './configure-environment/index.js';`,
    `    setConfigureEnvDetectDetailsOpen,
    bindConfigureEnvEvents,
    configureEnvModal,
    configureEnvDetectDetailsOpen,
    closeConfigureEnvModal,
} from './configure-environment/index.js';`,
);

body = body.replace(
    `    let multiSelectPurpose = 'normal';

`,
    `    let multiSelectPurpose = 'normal';
    let activeSessionId = '';
    const detectEnvBtn = document.getElementById('detectEnvBtn');

`,
);

const factorySuffix = `
    let quickActions;
    let permissions;
    let localHistory;
    let tokenUsage;
    let quickActions;
    let chatReset;
    let applyLocaleFn;

    localHistory = createLocalHistory({
        getLocale: () => locale,
        getPlaceholder: () => placeholder,
    });

    tokenUsage = createTokenUsage({ localeText });

    quickActions = createQuickActions({
        getLocale: () => locale,
        hideFilePicker: () => fileRefs.hideFilePicker(),
        syncInputHeightFromContent,
        clearChatSearch: () => chatSearch.clearChatSearch(),
        scheduleChatSearch: () => chatSearch.scheduleChatSearch(),
    });
    quickActions.bindQuickActionEvents();

    const {
        updateQuickActionBtns,
        appendToInput,
        insertIntoInput,
        insertToEditor,
    } = quickActions;

    const {
        removeLocalHistoryDivider,
        insertLocalHistoryDivider,
    } = localHistory;

    const { updateTokenUsage } = tokenUsage;

    chatReset = createChatReset({
        getLocale: () => locale,
        getPlaceholder: () => placeholder,
        setPlaceholder: (el) => { placeholder = el; },
        getCanSend: () => canSend,
        cancelSessionMarkdownRender: () => sessionRender.cancelSessionMarkdownRender(),
        scheduleSessionMarkdownRender: () => sessionRender.scheduleSessionMarkdownRender(),
        clearChatSearch: () => chatSearch.clearChatSearch(),
        exitMultiSelectMode: () => multiSelect.exitMultiSelectMode(),
        removeLocalHistoryDivider: () => localHistory.removeLocalHistoryDivider(),
        insertLocalHistoryDivider: () => localHistory.insertLocalHistoryDivider(),
        forceHideContextAttachPicker: () => contextAttach.forceHideContextAttachPicker(),
        resetStreamingState: () => {
            streamingMessageId = null;
            thoughtMsgId = null;
        },
        clearToolState: () => auxiliary.clearToolState(),
        resetSessionIndex: () => { sessionMsgCounter = 0; },
        resetToolAggregation: () => auxiliary.resetToolAggregation(),
        clearPendingPermissions: () => permissions.clearPendingPermissions(),
        updateQuickActionBtns,
        updateTokenUsage,
        setInputMode,
        restorePermissionMessage: (...a) => permissions.restorePermissionMessage(...a),
        addMessage: (...a) => messages.addMessage(...a),
    });

    const { newChat, clearChat, restoreHistory } = chatReset;

    applyLocaleFn = createApplyLocale({
        getLocale: () => locale,
        refreshModelButtonDisplay: () => pickers.refreshModelButtonDisplay(),
        updateContextAttachButtonLabel: () => contextAttach.updateContextAttachButtonLabel(),
        renderContextAttachOptions: () => contextAttach.renderContextAttachOptions(),
        updateMultiSelectToolbar: () => multiSelect.updateMultiSelectToolbar(),
        applyInfoModalLocale: () => infoModals.applyInfoModalLocale(),
        refreshAllPermissionLocale: () => permissions.refreshAllPermissionLocale(),
        refreshAllAuxiliaryLocale: () => auxiliary.refreshAllAuxiliaryLocale(),
    }).applyLocale;

    function applyLocale() {
        applyLocaleFn();
    }

`;

body = body.replace(
    /    chatSearch\.bindChatSearchEvents\(\);\n\n\n    const permissions = createPermissions/,
    `    chatSearch.bindChatSearchEvents();
${factorySuffix}

    const permissions = createPermissions`,
);

body = body.replace(
    '        updateQuickActionBtns,\n        getAwaitingFirstChunk',
    '        updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),\n        getAwaitingFirstChunk',
);
body = body.replace(
    '        syncInputHeightFromContent,\n        updateQuickActionBtns,\n    }\);',
    '        syncInputHeightFromContent,\n        updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),\n    });',
);
body = body.replace(
    '        reindexSessionIndices,\n        updateQuickActionBtns,\n        placeholder,',
    '        reindexSessionIndices,\n        updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),\n        placeholder,',
);
body = body.replace(
    '        enterMultiSelectMode: (...a) => multiSelect.enterMultiSelectMode(...a),\n        updateQuickActionBtns,\n        getAwaitingFirstChunk',
    '        enterMultiSelectMode: (...a) => multiSelect.enterMultiSelectMode(...a),\n        updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),\n        getAwaitingFirstChunk',
);
body = body.replace(
    '        syncInputHeightFromContent,\n        updateQuickActionBtns,\n        setAwaitingFirstChunk',
    '        syncInputHeightFromContent,\n        updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),\n        setAwaitingFirstChunk',
);

body = body.replace(
    /\n    let logViewer;\n    let inputMode;/,
    '\n    let quickActions;\n    let logViewer;\n    let inputMode;',
);

body = body.replace(
    /\n    const \{ renderSessionTabs, hideTabContextMenu \} = createSessionTabs\(\{[\s\S]*?\n    \}\);\n\n\n    const messageHandlers/,
    '\n    const { renderSessionTabs, hideTabContextMenu } = createSessionTabs({\n        getLocale: () => locale,\n        getLastSessions: () => lastSessions,\n        setLastSessions: (v) => { lastSessions = v; },\n        getLastActiveSessionId: () => lastActiveSessionId,\n        setLastActiveSessionId: (v) => { lastActiveSessionId = v; },\n        getActiveSessionId: () => activeSessionId,\n        setActiveSessionId: (v) => { activeSessionId = v; },\n        requestSwitchSession: switchSession.requestSwitchSession,\n        requestSessionExport,\n    });\n\n    const messageHandlers',
);

body = body.replace(
    /            updateTokenUsage,\n            getLocale/,
    '            updateTokenUsage: tokenUsage.updateTokenUsage,\n            getLocale',
);
body = body.replace(
    /            updateTokenUsage,\n            newChat/,
    '            updateTokenUsage: tokenUsage.updateTokenUsage,\n            newChat',
);
body = body.replace('    const permissions = createPermissions({', '    permissions = createPermissions({');

// Drop configure-environment imports only used by applyLocale (keep bind + modal refs)
body = body.replace(
    /import \{\n    configureEnvDetectSteps,\n[\s\S]*?    setConfigureEnvDetectDetailsOpen,\n    bindConfigureEnvEvents,\n    configureEnvModal,\n    configureEnvDetectDetailsOpen,\n    closeConfigureEnvModal,\n\} from '\.\/configure-environment\/index\.js';\n/,
    `import {
    configureEnvDetectDetailsOpen,
    bindConfigureEnvEvents,
    configureEnvModal,
    closeConfigureEnvModal,
} from './configure-environment/index.js';
`,
);

body = body.replace(
    /import \{\n    DETECT_STEP_IDS,\n    detectStepLabel,\n    refreshDetectStepLabels,\n    setDetectEnvIcon,\n\} from '\.\/detect-environment\/steps\.js';\n/,
    '',
);

body = body.replace(
    /import \{\n    detectEnvDetailsOpen,\n    detectEnvPanelReady,\n    setDetectEnvDetailsOpen,\n    setDetectEnvDetailsTitle,\n\} from '\.\/detect-environment\/toolbar\.js';/,
    `import {
    detectEnvDetailsOpen,
    setDetectEnvDetailsOpen,
} from './detect-environment/toolbar.js';`,
);

// Remove unused dom-ref / util imports
body = body.replace("import { formatTokenCount } from './utils/format.js';\n", '');
body = body.replace(
    /    tokenUsageRing,\n    tokenUsageArc,\n    tokenUsagePct,\n/,
    '',
);
body = body.replace(
    /    TOKEN_RING_RADIUS,\n    TOKEN_RING_CIRCUMFERENCE,\n/,
    '',
);
body = body.replace(
    /    RESTORE_BATCH_SIZE,\n/,
    '',
);

fs.writeFileSync(chatAppPath, body);
console.log('Step 9 applied.');
