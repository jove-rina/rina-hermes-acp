/**
 * Step 3: extract markdown, input height, scroll, dom refs, simple message handlers.
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

// --- Module files ---
w(
    'core/dom-refs.js',
    `${slice(39, 71).replace(/^const /gm, 'export const ')}

export const SESSION_RENDER_BANNER_ID = 'sessionRenderBanner';
export const RESTORE_BATCH_SIZE = 30;
export const MARKDOWN_RENDER_BATCH_SIZE = 4;
export const LOCAL_HISTORY_DIVIDER_ID = 'localHistoryDivider';
`,
);

w(
    'messages/markdown.js',
    `${slice(2759, 2779).replace(/^function renderMarkdown/, 'export function renderMarkdown')}`,
);

w(
    'utils/format.js',
    `${slice(1209, 1221).replace(/^function formatTokenCount/, 'export function formatTokenCount')}`,
);

w(
    'ui/modal.js',
    `${slice(1971, 1976).replace(/^function /gm, 'export function ')}`,
);

w(
    'input/height.js',
    `import {
    chatBodyEl,
    inputAreaEl,
    inputEl,
    inputResizeHandle,
} from '../core/dom-refs.js';

export const INPUT_HEIGHT_STORAGE_KEY = 'hermes-chat-input-max-height';
export const INPUT_HEIGHT_MIN = 36;
export const INPUT_HEIGHT_DEFAULT = 120;

${slice(321, 369).replace(/^function /gm, 'export function ')}

export function initInputHeight() {
    let saved = INPUT_HEIGHT_DEFAULT;
    try {
        const raw = localStorage.getItem(INPUT_HEIGHT_STORAGE_KEY);
        if (raw) saved = parseInt(raw, 10);
    } catch (_) {}
    if (isNaN(saved)) saved = INPUT_HEIGHT_DEFAULT;
    setInputMaxHeight(saved, { persist: false, explicit: false });
}

export function setupInputResize() {
    if (!inputResizeHandle) return;
    let dragging = false;
    let startY = 0;
    let startHeight = 0;

    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        inputResizeHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try { inputResizeHandle.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    inputResizeHandle.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) return;
        dragging = true;
        startY = e.clientY;
        startHeight = inputEl.offsetHeight;
        inputResizeHandle.classList.add('dragging');
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        inputResizeHandle.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    inputResizeHandle.addEventListener('pointermove', function(e) {
        if (!dragging) return;
        setInputMaxHeight(startHeight + (startY - e.clientY), { explicit: true });
    });
    inputResizeHandle.addEventListener('pointerup', endDrag);
    inputResizeHandle.addEventListener('pointercancel', endDrag);
}

export function bindInputHeightResizeListener() {
    window.addEventListener('resize', syncInputHeightFromContent);
}
`,
);

w(
    'messages/scroll.js',
    `import { messagesEl } from '../core/dom-refs.js';

export const SCROLL_BOTTOM_THRESHOLD = 24;
export const SCROLL_IDLE_MS = 5000;
export let scrollPinnedByUser = false;
export let scrollIdleTimer = null;

${slice(1154, 1207).replace(/^function /gm, 'export function ')}

export function bindMessagesScrollListener(getStreamingState) {
    if (!messagesEl) return;
    messagesEl.addEventListener('scroll', function() {
        onMessagesScroll(getStreamingState);
    }, { passive: true });
}

export function onMessagesScroll(getStreamingState) {
    const state = typeof getStreamingState === 'function' ? getStreamingState() : getStreamingState;
    if (!state.isActivelyStreaming()) return;
    if (!isMessagesAtBottom()) {
        scrollPinnedByUser = true;
    }
    scheduleScrollReenable(state.isActivelyStreaming);
}
`,
);

// Fix scroll.js - original onMessagesScroll calls isActivelyStreaming() directly, scheduleScrollReenable too
// Re-read original and use simpler extraction without callback injection

w(
    'messages/scroll.js',
    `import { messagesEl } from '../core/dom-refs.js';

export const SCROLL_BOTTOM_THRESHOLD = 24;
export const SCROLL_IDLE_MS = 5000;
export let scrollPinnedByUser = false;
export let scrollIdleTimer = null;

/** @type {() => boolean} */
let isActivelyStreamingFn = () => false;

export function configureScrollStreaming(isActivelyStreaming) {
    isActivelyStreamingFn = isActivelyStreaming;
}

export function isMessagesAtBottom() {
    if (!messagesEl) {
        return true;
    }
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
}

export function maybeScrollToBottom(force) {
    if (!messagesEl) {
        return;
    }
    if (force || !scrollPinnedByUser) {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
}

export function scheduleScrollReenable() {
    if (scrollIdleTimer) {
        clearTimeout(scrollIdleTimer);
    }
    scrollIdleTimer = setTimeout(function() {
        scrollIdleTimer = null;
        if (isActivelyStreamingFn()) {
            scrollPinnedByUser = false;
            maybeScrollToBottom(true);
        }
    }, SCROLL_IDLE_MS);
}

export function onMessagesScroll() {
    if (!isActivelyStreamingFn()) {
        return;
    }
    if (!isMessagesAtBottom()) {
        scrollPinnedByUser = true;
    }
    scheduleScrollReenable();
}

export function resetAutoScrollFollow() {
    scrollPinnedByUser = false;
    if (scrollIdleTimer) {
        clearTimeout(scrollIdleTimer);
        scrollIdleTimer = null;
    }
}

export function bindMessagesScrollListener() {
    if (messagesEl) {
        messagesEl.addEventListener('scroll', onMessagesScroll, { passive: true });
    }
}
`,
);

w(
    'bridge/handlers/simple.js',
    `/** @param {Record<string, Function>} deps */
export function createSimpleHandlers(deps) {
    return {
        tokenUsage(msg) {
            deps.updateTokenUsage(msg.used, msg.size);
        },
        newChat() {
            deps.newChat();
        },
        clearChat() {
            deps.clearChat();
        },
        insertInput(msg) {
            deps.insertIntoInput(msg.text || '');
        },
        sessionList(msg) {
            deps.renderSessionTabs(msg.sessions, msg.activeSessionId);
        },
        openLogs() {
            deps.openLogModal();
        },
        openAbout() {
            deps.renderAboutContent();
            deps.showModal(deps.aboutModal);
        },
        openHelp() {
            deps.showModal(deps.helpModal);
        },
        openFaq() {
            deps.showModal(deps.faqModal);
        },
    };
}
`,
);

// --- Patch chat-app.js ---
const fileContent = fs.readFileSync(chatAppPath, 'utf-8');
const oldHeaderMatch = fileContent.match(/^[\s\S]*?^let locale = getLocale\(\);\n\n/m);
if (!oldHeaderMatch) {
    throw new Error('Could not find Step 2 import header in chat-app.js — run apply-step2-split.mjs first');
}
const headerLineCount = oldHeaderMatch[0].split(/\r?\n/).length - 1;

const header = `import { vscode } from './core/vscode.js';
import { getLocale, setLocale } from './core/locale.js';
import {
    messagesEl,
    chatBodyEl,
    inputEl,
    inputAreaEl,
    inputCompositeEl,
    inputCompositeShellEl,
    inputResizeHandle,
    sendBtn,
    tokenUsageRing,
    tokenUsageArc,
    tokenUsagePct,
    clearChatBtn,
    clearInputBtn,
    copySessionBtn,
    quickToggleBtn,
    inputQuickPanel,
    chatSearchInput,
    chatSearchCount,
    chatSearchPrev,
    chatSearchNext,
    newChatBtn,
    multiSelectToolbar,
    multiSelectCount,
    multiSelectAllBtn,
    multiSelectDeleteBtn,
    multiSelectCopyBtn,
    multiSelectExportBtn,
    multiSelectAttachConfirmBtn,
    multiSelectExitBtn,
    statusDot,
    statusText,
    SESSION_RENDER_BANNER_ID,
    RESTORE_BATCH_SIZE,
    MARKDOWN_RENDER_BATCH_SIZE,
    LOCAL_HISTORY_DIVIDER_ID,
    TOKEN_RING_RADIUS,
    TOKEN_RING_CIRCUMFERENCE,
} from './core/dom-refs.js';
import { buildFaqAccordion } from './locale/faq.js';
import { escapeHtml } from './utils/escape-html.js';
import { basenameFromPath } from './utils/path.js';
import { formatTokenCount } from './utils/format.js';
import { renderMarkdown } from './messages/markdown.js';
import {
    maybeScrollToBottom,
    resetAutoScrollFollow,
    configureScrollStreaming,
    bindMessagesScrollListener,
} from './messages/scroll.js';
import {
    syncInputHeightFromContent,
    setInputMaxHeight,
    initInputHeight,
    setupInputResize,
    bindInputHeightResizeListener,
} from './input/height.js';
import { showModal, hideModal } from './ui/modal.js';
import {
    DETECT_STEP_IDS,
    detectStepLabel,
    refreshDetectStepLabels,
    setDetectEnvIcon,
} from './detect-environment/steps.js';
import {
    detectEnvDetailsOpen,
    detectEnvPanelReady,
    setDetectEnvDetailsOpen,
    setDetectEnvDetailsTitle,
} from './detect-environment/toolbar.js';
import { bindDetectToolbarEvents, doDetectEnvironment } from './detect-environment/bind-events.js';
import {
    configureEnvDetectSteps,
    configureEnvDetectToggle,
    configureEnvPathInput,
    configureEnvPathClearBtn,
    configureEnvBrowseBtn,
    configureEnvDetectBtn,
    configureEnvSaveBtn,
    configureEnvSystemBtn,
    configureEnvDetectDetailsOpen,
    updateConfigureEnvPathClearVisibility,
    updateConfigureEnvSystemHint,
    setConfigureEnvDetectDetailsTitle,
    setConfigureEnvDetectDetailsOpen,
    bindConfigureEnvEvents,
} from './configure-environment/index.js';
import { createEnvironmentHandlers } from './bridge/handlers/environment.js';
import { createSimpleHandlers } from './bridge/handlers/simple.js';

let locale = getLocale();

let placeholder = document.getElementById('placeholder');

initInputHeight();
setupInputResize();
bindInputHeightResizeListener();

`;

const removeSet = new Set();
// dom refs block (keep placeholder + session state vars 72-78)
for (let i = 39; i <= 72; i++) removeSet.add(i);
for (let i = 79; i <= 83; i++) removeSet.add(i);
// input height
for (let i = 317; i <= 413; i++) removeSet.add(i);
// scroll block
for (let i = 1149; i <= 1207; i++) removeSet.add(i);
// showModal/hideModal
for (let i = 1971; i <= 1976; i++) removeSet.add(i);
// renderMarkdown
for (let i = 2759; i <= 2779; i++) removeSet.add(i);
// formatTokenCount
for (let i = 1209; i <= 1221; i++) removeSet.add(i);

const allLines = fileContent.split(/\r?\n/);
let body = allLines
    .filter((_, idx) => {
        const lineNum = idx + 1;
        if (lineNum <= headerLineCount) {
            return false;
        }
        return !removeSet.has(lineNum);
    })
    .join('\n');

// Remove duplicate TOKEN_RING in body if any
body = body.replace(/\n    const TOKEN_RING_RADIUS = 11;\n    const TOKEN_RING_CIRCUMFERENCE[^\n]+\n/, '\n');

// Replace init input height IIFE calls
body = body.replace(/\n    \(function initInputHeight\(\)[\s\S]*?\}\)\(\);\n\n    \(function setupInputResize\(\)[\s\S]*?\}\)\(\);\n/, '\n    initInputHeight();\n    setupInputResize();\n');
body = body.replace(/\n    window\.addEventListener\('resize', syncInputHeightFromContent\);\n/, '\n    bindInputHeightResizeListener();\n');

// Remove messages scroll listener block
body = body.replace(/\n    if \(messagesEl\) \{\n        messagesEl\.addEventListener\('scroll', onMessagesScroll, \{ passive: true \}\);\n    \}\n/, '\n    bindMessagesScrollListener();\n');

// Add isActivelyStreaming + scroll init after streaming state vars
body = body.replace(
    /(let isPrompting = false;\n)/,
    `$1
    function isActivelyStreaming() {
        return !!(streamingMessageId || isPrompting);
    }
    configureScrollStreaming(isActivelyStreaming);
    bindMessagesScrollListener();

`,
);

// Merge simple handlers into message dispatch
const simpleCasePatterns = [
    /\n            case 'tokenUsage':[\s\S]*?break;\n/,
    /\n            case 'newChat':[\s\S]*?break;\n/,
    /\n            case 'clearChat':[\s\S]*?break;\n/,
    /\n            case 'insertInput':[\s\S]*?break;\n/,
    /\n            case 'sessionList':[\s\S]*?break;\n/,
    /\n            case 'openLogs':[\s\S]*?break;\n/,
    /\n            case 'openAbout':[\s\S]*?break;\n/,
    /\n            case 'openHelp':[\s\S]*?break;\n/,
    /\n            case 'openFaq':[\s\S]*?break;\n/,
];
for (const re of simpleCasePatterns) {
    body = body.replace(re, '\n');
}

body = body.replace(
    /const environmentHandlers = createEnvironmentHandlers\(\{ placeholder \}\);/,
    `const messageHandlers = {
        ...createEnvironmentHandlers({ placeholder }),
        ...createSimpleHandlers({
            updateTokenUsage,
            newChat,
            clearChat,
            insertIntoInput,
            renderSessionTabs,
            openLogModal,
            renderAboutContent,
            showModal,
            aboutModal,
            helpModal,
            faqModal,
        }),
    };`,
);

body = body.replace(
    /const environmentHandler = environmentHandlers\[msg\.type\];/,
    'const environmentHandler = messageHandlers[msg.type];',
);

fs.writeFileSync(chatAppPath, header + body);
console.log('Step 3 applied.');
