/**
 * Apply Step 2 module split to chat-app.js (run once).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = path.join(root, 'media', 'src');
const extract = path.join(src, '_extract');
const chatAppPath = path.join(src, 'chat-app.js');

function read(name) {
    return fs.readFileSync(path.join(extract, name), 'utf-8').trimEnd();
}

function loc(s) {
    return s.replace(/\blocale\b/g, 'getLocale()');
}

function w(rel, content) {
    const p = path.join(src, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content.trimStart() + '\n');
}

const stepsRaw = read('steps.txt').split('\n');

w('core/vscode.js', 'export const vscode = acquireVsCodeApi();\n');

w(
    'core/locale.js',
    `/** @returns {Record<string, string>} */
export function getLocale() {
    return window.__HERMES_LOCALE__ || {};
}

/** @param {Record<string, string>} next */
export function setLocale(next) {
    window.__HERMES_LOCALE__ = next;
}
`,
);

w(
    'utils/escape-html.js',
    `export function escapeHtml(s) {
    return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
`,
);

w(
    'utils/path.js',
    `export function basenameFromPath(filePath) {
    if (!filePath) return 'hermes';
    const parts = filePath.split(/[/\\\\]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : 'hermes';
}
`,
);

w('locale/faq.js', read('faq.txt').replace(/^function /, 'export function '));

w(
    'detect-environment/steps.js',
    `import { getLocale } from '../core/locale.js';

${loc([...stepsRaw.slice(0, 15), ...stepsRaw.slice(20, 69), ...stepsRaw.slice(93)].join('\n'))
    .replace(/^const DETECT/gm, 'export const DETECT')
    .replace(/^function /gm, 'export function ')}
`,
);

w(
    'detect-environment/toolbar.js',
    `import { getLocale } from '../core/locale.js';
import {
    DETECT_STEP_IDS,
    formatDetectProgressDisplay,
    setDetectEnvIcon,
    updateDetectStepsList,
    ensureDetectStepsList,
} from './steps.js';

export let detectEnvDetailsOpen = false;
export let detectEnvPanelReady = false;
export let detectEnvFinished = false;

${loc([...stepsRaw.slice(70, 92), read('toolbar.txt')].join('\n')).replace(/^function /gm, 'export function ')}
`,
);

const configureBody = loc(
    read('configure.txt')
        .replace(/function basenameFromPath[\s\S]*?\n\}/, '')
        .replace(/^const configureEnv/gm, 'export const configureEnv')
        .replace(/^let configureEnv/gm, 'export let configureEnv')
        .replace(/^function /gm, 'export function '),
);

w(
    'configure-environment/index.js',
    `import { getLocale } from '../core/locale.js';
import { vscode } from '../core/vscode.js';
import { escapeHtml } from '../utils/escape-html.js';
import { basenameFromPath } from '../utils/path.js';
import {
    ensureDetectStepsList,
    formatDetectProgressDisplay,
    resetDetectStepsList,
    setDetectEnvIcon,
    updateDetectStepsList,
} from '../detect-environment/steps.js';

${configureBody}

export function bindConfigureEnvEvents() {
    if (configureEnvBrowseBtn) configureEnvBrowseBtn.addEventListener('click', browseConfigureEnvPath);
    if (configureEnvDetectBtn) configureEnvDetectBtn.addEventListener('click', startConfigureEnvDetect);
    if (configureEnvDetectClose) {
        configureEnvDetectClose.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeConfigureEnvDetectPanel();
        });
    }
    if (configureEnvPathClearBtn) {
        configureEnvPathClearBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            clearConfigureEnvPath();
        });
    }
    if (configureEnvPathInput) {
        configureEnvPathInput.addEventListener('input', function() {
            configureEnvSelectedPath = configureEnvPathInput.value.trim();
            updateConfigureEnvPathClearVisibility();
        });
    }
    if (configureEnvDetectToggle) {
        configureEnvDetectToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            setConfigureEnvDetectDetailsOpen(!configureEnvDetectDetailsOpen);
        });
    }
    if (configureEnvSaveBtn) configureEnvSaveBtn.addEventListener('click', saveConfigureEnvPath);
    if (configureEnvCancelBtn) configureEnvCancelBtn.addEventListener('click', closeConfigureEnvModal);
    if (configureEnvCloseBtn) configureEnvCloseBtn.addEventListener('click', closeConfigureEnvModal);
    if (configureEnvSystemBtn) configureEnvSystemBtn.addEventListener('click', requestConfigureEnvSystemPath);
    if (configureEnvModal) {
        configureEnvModal.addEventListener('click', function(e) {
            if (e.target === configureEnvModal) closeConfigureEnvModal();
        });
    }
}

export function applyConfigureEnvBrowsePath(path) {
    if (!configureEnvPathInput) return;
    configureEnvPathInput.value = path;
    configureEnvSelectedPath = path;
    updateConfigureEnvPathClearVisibility();
}
`,
);

w(
    'detect-environment/bind-events.js',
    `import { vscode } from '../core/vscode.js';
import { detectEnvDetailsOpen, setDetectEnvDetailsOpen } from './toolbar.js';

export function doDetectEnvironment() {
    vscode.postMessage({ type: 'detectEnvironment' });
}

export function bindDetectToolbarEvents(detectEnvBtn, detectEnvClose) {
    const detectEnvToggle = document.getElementById('detectEnvToggle');
    if (detectEnvToggle) {
        detectEnvToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            setDetectEnvDetailsOpen(!detectEnvDetailsOpen);
            detectEnvToggle.setAttribute('aria-expanded', detectEnvDetailsOpen ? 'true' : 'false');
        });
    }
    if (detectEnvClose) {
        detectEnvClose.addEventListener('click', function(e) {
            e.stopPropagation();
            hideDetectEnvironmentBar();
            vscode.postMessage({ type: 'detectEnvironmentDismiss' });
        });
    }
    if (detectEnvBtn) detectEnvBtn.addEventListener('click', doDetectEnvironment);
}
`,
);

w(
    'bridge/message-bridge.js',
    `/** @param {Record<string, (msg: Record<string, unknown>) => void>} handlers */
export function initMessageBridge(handlers) {
    window.addEventListener('message', function(event) {
        const msg = event.data;
        const handler = handlers[msg.type];
        if (handler) handler(msg);
    });
}
`,
);

w(
    'bridge/handlers/environment.js',
    `import {
    finishDetectEnvironmentPanel,
    initDetectEnvironmentStart,
    updateDetectEnvironmentStep,
} from '../../detect-environment/toolbar.js';
import { setDetectEnvIcon } from '../../detect-environment/steps.js';
import {
    applyConfigureEnvBrowsePath,
    closeConfigureEnvModal,
    configureEnvDetectCompactIcon,
    configureEnvDetectCompactText,
    finishConfigureEnvDetect,
    hideConfigureEnvDetectProgress,
    openConfigureEnvModal,
    setConfigureEnvDetecting,
    showConfigureEnvDetectPanel,
    updateConfigureEnvDetectProgress,
} from '../../configure-environment/index.js';

/** @param {{ placeholder: HTMLElement | null }} deps */
export function createEnvironmentHandlers(deps) {
    return {
        detectEnvironmentStart(msg) {
            initDetectEnvironmentStart(msg.mode || 'manual');
            if (deps.placeholder) deps.placeholder.style.display = 'none';
        },
        detectEnvironmentProgress(msg) {
            updateDetectEnvironmentStep(msg);
        },
        detectEnvironmentEnd(msg) {
            finishDetectEnvironmentPanel(msg);
        },
        configureEnvironmentOpen(msg) {
            openConfigureEnvModal(msg.currentPath || '', msg.systemEnvVar, msg.systemEnvTarget);
        },
        configureEnvironmentDetectStart() {
            setConfigureEnvDetecting(true);
        },
        configureEnvironmentDetectProgress(msg) {
            updateConfigureEnvDetectProgress(msg);
        },
        configureEnvironmentDetectEnd(msg) {
            finishConfigureEnvDetect(msg);
        },
        configureEnvironmentDetectClosed() {
            hideConfigureEnvDetectProgress();
            setConfigureEnvDetecting(false);
        },
        configureEnvironmentBrowseResult(msg) {
            if (msg.path) {
                applyConfigureEnvBrowsePath(msg.path);
            } else if (msg.error && configureEnvDetectCompactText) {
                showConfigureEnvDetectPanel();
                configureEnvDetectCompactText.textContent = msg.error;
                setDetectEnvIcon(configureEnvDetectCompactIcon, 'fail');
            }
        },
        configureEnvironmentSaveResult(msg) {
            if (msg.ok) {
                closeConfigureEnvModal();
            } else if (msg.error && configureEnvDetectCompactText) {
                showConfigureEnvDetectPanel();
                configureEnvDetectCompactText.textContent = msg.error;
                setDetectEnvIcon(configureEnvDetectCompactIcon, 'fail');
            }
        },
    };
}
`,
);

const header = `import { vscode } from './core/vscode.js';
import { getLocale, setLocale } from './core/locale.js';
import { buildFaqAccordion } from './locale/faq.js';
import { escapeHtml } from './utils/escape-html.js';
import { basenameFromPath } from './utils/path.js';
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

let locale = getLocale();

`;

const lines = fs.readFileSync(chatAppPath, 'utf-8').split(/\r?\n/);
const removeSet = new Set([1, 2]);
for (let i = 79; i <= 726; i++) removeSet.add(i);

let body = lines.filter((_, idx) => !removeSet.has(idx + 1)).join('\n');
body = body.replace(/^\s*const vscode = acquireVsCodeApi\(\);\s*\n/m, '');

for (const re of [
    /\n            case 'detectEnvironmentStart':[\s\S]*?break;\n/,
    /\n            case 'detectEnvironmentProgress':[\s\S]*?break;\n/,
    /\n            case 'detectEnvironmentEnd':[\s\S]*?break;\n/,
    /\n            case 'configureEnvironmentOpen':[\s\S]*?break;\n/,
    /\n            case 'configureEnvironmentDetectStart':[\s\S]*?break;\n/,
    /\n            case 'configureEnvironmentDetectProgress':[\s\S]*?break;\n/,
    /\n            case 'configureEnvironmentDetectEnd':[\s\S]*?break;\n/,
    /\n            case 'configureEnvironmentDetectClosed':[\s\S]*?break;\n/,
    /\n            case 'configureEnvironmentBrowseResult':[\s\S]*?break;\n/,
    /\n            case 'configureEnvironmentSaveResult':[\s\S]*?break;\n/,
]) {
    body = body.replace(re, '\n');
}

body = body.replace(
    /\n    if \(configureEnvBrowseBtn\) \{[\s\S]*?if \(configureEnvModal\) \{[\s\S]*?\}\);\n    \}\n/,
    '\n    bindConfigureEnvEvents();\n',
);

body = body.replace(
    /\n    const detectEnvToggle = document\.getElementById\('detectEnvToggle'\);[\s\S]*?if \(detectEnvBtn\) \{\n        detectEnvBtn\.addEventListener\('click', doDetectEnvironment\);\n    \}\n/,
    "\n    bindDetectToolbarEvents(detectEnvBtn, document.getElementById('detectEnvClose'));\n",
);

body = body.replace(/\n    function doDetectEnvironment\(\) \{[\s\S]*?\n    \}\n/, '\n');
body = body.replace(/\n    function escapeHtml\(s\) \{[\s\S]*?\n    \}\n/, '\n');
body = body.replace(
    /locale = msg\.locale;/,
    'setLocale(msg.locale);\n                    locale = getLocale();',
);

body = body.replace(
    /window\.addEventListener\('message', function\(event\) \{\s*\n        const msg = event\.data;\s*\n        switch \(msg\.type\) \{/,
    `const environmentHandlers = createEnvironmentHandlers({ placeholder });
    window.addEventListener('message', function(event) {
        const msg = event.data;
        const environmentHandler = environmentHandlers[msg.type];
        if (environmentHandler) {
            environmentHandler(msg);
            return;
        }
        switch (msg.type) {`,
);

fs.writeFileSync(chatAppPath, header + body);
fs.rmSync(extract, { recursive: true, force: true });

console.log('Step 2 applied.');
