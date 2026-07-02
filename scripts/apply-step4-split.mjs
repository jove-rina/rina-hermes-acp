/**
 * Step 4: extract permissions, content-blocks, session tabs, message handlers, icons, clipboard.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const chatAppPath = path.join(root, 'media', 'src', 'chat-app.js');

let content = fs.readFileSync(chatAppPath, 'utf-8');
const lines = content.split(/\r?\n/);

function removeLineRange(start, end) {
    for (let i = start; i <= end; i++) {
        delete lines[i - 1];
    }
}

// 1-based inclusive line removals
removeLineRange(1110, 1115); // pendingPermissions + PERM constants
removeLineRange(1331, 1608); // permission UI functions
removeLineRange(1868, 1892); // icons + clipboard
removeLineRange(2707, 2850); // content blocks
removeLineRange(3369, 3371); // local tabBar/tabContextMenu
removeLineRange(3626, 3950); // session tabs + showPermissionRequest block

const body = lines.filter((l) => l !== undefined).join('\n');

const extraImports = `import { COPY_ICON_SVG, SELECT_ICON_SVG } from './ui/icons.js';
import { copyToClipboard } from './utils/clipboard.js';
import { createPermissions } from './messages/permissions.js';
import { createContentBlocks } from './messages/content-blocks.js';
import { createSessionTabs } from './sessions/tabs.js';
import { createMessageHandlers } from './bridge/handlers/messages.js';
`;

let patched = body.replace(
    "import { createSimpleHandlers } from './bridge/handlers/simple.js';",
    "import { createSimpleHandlers } from './bridge/handlers/simple.js';\n" + extraImports,
);

patched = patched.replace(
    /        pendingPermissions\.forEach\(function\(group\) \{[\s\S]*?        \}\);\n        document\.querySelectorAll\('\.message-group\.thought/,
    "        permissions.refreshAllPermissionLocale();\n        document.querySelectorAll('.message-group.thought",
);

patched = patched.replace(/pendingPermissions\.clear\(\)/g, 'permissions.clearPendingPermissions()');

for (const re of [
    /\n            case 'addMessage':[\s\S]*?break;\n\n            case 'status':/,
    /\n            case 'restoreHistory':[\s\S]*?break;\n/,
    /\n            case 'finishAssistantBubble':[\s\S]*?break;\n/,
    /\n            case 'permissionRequest':[\s\S]*?break;\n/,
    /\n            case 'permissionUpdate':[\s\S]*?break;\n/,
    /\n            case 'permissionDismiss':[\s\S]*?break;\n/,
]) {
    patched = patched.replace(re, (match, ...args) => {
        if (re.source.includes("case 'status'")) {
            return '\n            case \'status\':';
        }
        return '\n';
    });
}

const factoryInit = `
    const permissions = createPermissions({
        getLocale: () => locale,
        localeText,
        assignSessionIndex,
        finalizeAssistantBubble,
        placeholder,
        enableStopAfterAgentOutput,
        maybeScrollToBottom,
    });
    const {
        restorePermissionMessage,
        updatePermissionContent,
        showPermissionRequest,
        dismissPermissionRequest,
    } = permissions;

    const { setupContentBlocks, closeInsertDropdowns } = createContentBlocks({
        getLocale: () => locale,
        appendToInput,
        insertToEditor,
    });

    const { renderSessionTabs, hideTabContextMenu } = createSessionTabs({
        getLocale: () => locale,
        getLastSessions: () => lastSessions,
        setLastSessions: (v) => { lastSessions = v; },
        getLastActiveSessionId: () => lastActiveSessionId,
        setLastActiveSessionId: (v) => { lastActiveSessionId = v; },
        getActiveSessionId: () => activeSessionId,
        setActiveSessionId: (v) => { activeSessionId = v; },
        requestSwitchSession,
        requestSessionExport,
    });

`;

patched = patched.replace(/\n    const messageHandlers = \{/, factoryInit + '\n    const messageHandlers = {');

patched = patched.replace(
    `const messageHandlers = {
        ...createEnvironmentHandlers({ placeholder }),
        ...createSimpleHandlers({`,
    `const messageHandlers = {
        ...createEnvironmentHandlers({ placeholder }),
        ...createMessageHandlers({
            isMessageForActiveSession,
            addMessage,
            handleToolMessage,
            getThoughtMsgId: () => thoughtMsgId,
            setThoughtMsgId: (id) => { thoughtMsgId = id; },
            setAuxiliaryContent,
            setAuxMessageLive,
            maybeScrollToBottom,
            restoreHistory,
            finalizeAssistantBubble,
            getIsPrompting: () => isPrompting,
            getAwaitingFirstChunk: () => awaitingFirstChunk,
            setInputMode,
            showPermissionRequest,
            pendingPermissions: null,
            updatePermissionContent,
            dismissPermissionRequest,
            getLocale: () => locale,
        }),
        ...createSimpleHandlers({`,
);

// Wire pendingPermissions reference after permissions const exists
patched = patched.replace(
    'pendingPermissions: null,',
    'pendingPermissions: permissions.pendingPermissions,',
);

fs.writeFileSync(chatAppPath, patched);
console.log('Step 4 applied.');
