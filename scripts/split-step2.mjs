/**
 * Step 2: split chat-app.js into ES modules (detect/configure env, bridge, utils).
 * Run once after editing chat-app.js monolith; then maintain modules directly.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const src = path.join(root, 'media', 'src');
const chatAppPath = path.join(src, 'chat-app.js');

const lines = fs.readFileSync(chatAppPath, 'utf-8').split(/\r?\n/);

/** 1-indexed inclusive line range → de-indented source. */
function slice(start, end) {
    return lines
        .slice(start - 1, end)
        .map((line) => (line.startsWith('    ') ? line.slice(4) : line))
        .join('\n');
}

/** Remove 1-indexed inclusive line ranges from chat-app (multiple ranges, sorted desc). */
function removeRanges(ranges) {
    const remove = new Set();
    for (const [start, end] of ranges) {
        for (let i = start; i <= end; i++) {
            remove.add(i);
        }
    }
    return lines.filter((_, idx) => !remove.has(idx + 1));
}

function write(rel, content) {
    const filePath = path.join(src, rel);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content.trimStart() + '\n');
}

// --- Extract sections (line numbers from original chat-app.js) ---
const detectBlock = slice(79, 314);
const configureBlock = slice(316, 685);
const faqBlock = slice(687, 726);

write('core/vscode.js', `export const vscode = acquireVsCodeApi();\n`);

write('core/locale.js', `/** @typedef {Record<string, string>} LocaleStrings */

/** @returns {LocaleStrings} */
export function getLocale() {
    return window.__HERMES_LOCALE__ || {};
}

/** @param {LocaleStrings} next */
export function setLocale(next) {
    window.__HERMES_LOCALE__ = next;
}

/** Shorthand used throughout webview modules. */
export function locale() {
    return getLocale();
}
`);

write('utils/escape-html.js', slice(4503, 4508));

write('utils/path.js', slice(511, 515));

write(
    'locale/faq.js',
    `${faqBlock}
`,
);

write(
    'detect-environment/steps.js',
    `import { getLocale } from '../core/locale.js';

${detectBlock.split('\n').slice(0, 159).join('\n')}
`,
);

// detect block lines 79-237 = constants + steps (first 159 lines of detectBlock = through updateDetectStepsList)
// detect toolbar = rest of detectBlock from ensureDetectEnvironmentPanel

const detectLines = detectBlock.split('\n');
const detectStepsPart = detectLines.slice(0, 159).join('\n');
const detectToolbarPart = detectLines.slice(159).join('\n');

write(
    'detect-environment/steps.js',
    `import { getLocale } from '../core/locale.js';

${detectStepsPart.replace(/\blocale\b/g, 'getLocale()').replace(/getLocale\(\)\./g, 'getLocale().')}
`,
);

write(
    'detect-environment/toolbar.js',
    `import { getLocale } from '../core/locale.js';
import {
    DETECT_STEP_IDS,
    detectStepLabel,
    formatDetectProgressDisplay,
    refreshDetectStepLabels,
    setDetectEnvIcon,
    updateDetectStepsList,
} from './steps.js';

export let detectEnvDetailsOpen = false;
export let detectEnvPanelReady = false;
export let detectEnvFinished = false;

${detectToolbarPart
    .replace(/\bdetectEnvDetailsOpen\b/g, 'detectEnvDetailsOpen')
    .replace(/\blocale\./g, 'getLocale().')
    .replace(/getLocale\(\)\[/g, 'getLocale()[')}
`,
);

write(
    'configure-environment/index.js',
    `import { getLocale } from '../core/locale.js';
import { vscode } from '../core/vscode.js';
import { escapeHtml } from '../utils/escape-html.js';
import { basenameFromPath } from '../utils/path.js';
import {
    ensureDetectStepsList,
    formatDetectProgressDisplay,
    refreshDetectStepLabels,
    resetDetectStepsList,
    setDetectEnvIcon,
    updateDetectStepsList,
} from '../detect-environment/steps.js';

${configureBlock
    .replace(/\bconst configureEnv/g, 'export const configureEnv')
    .replace(/^let configureEnv/m, 'export let configureEnv')
    .replace(/\blocale\./g, 'getLocale().')
    .replace(/\blocaleText\(/g, 'localeText(')
    .replace(/function basenameFromPath[\s\S]*?\n    \}/, '')
    .replace(/function createConfigureEnvFolderIcon/, 'function createConfigureEnvFolderIcon')}
`,
);

// Fix configure block - basenameFromPath was inline, we import it. Remove duplicate function.
let configureContent = fs.readFileSync(path.join(src, 'configure-environment/index.js'), 'utf-8');
configureContent = configureContent.replace(
    /function basenameFromPath\(filePath\) \{[\s\S]*?\n\}\n\n/,
    '',
);
fs.writeFileSync(path.join(src, 'configure-environment/index.js'), configureContent);

write(
    'configure-environment/bind-events.js',
    `import {
    browseConfigureEnvPath,
    clearConfigureEnvPath,
    closeConfigureEnvDetectPanel,
    closeConfigureEnvModal,
    configureEnvBrowseBtn,
    configureEnvCancelBtn,
    configureEnvCloseBtn,
    configureEnvDetectBtn,
    configureEnvDetectClose,
    configureEnvDetectToggle,
    configureEnvModal,
    configureEnvPathClearBtn,
    configureEnvPathInput,
    configureEnvSaveBtn,
    configureEnvSystemBtn,
    requestConfigureEnvSystemPath,
    saveConfigureEnvPath,
    setConfigureEnvDetectDetailsOpen,
    configureEnvDetectDetailsOpen,
    startConfigureEnvDetect,
    updateConfigureEnvPathClearVisibility,
    configureEnvSelectedPath,
} from './index.js';

export function bindConfigureEnvEvents() {
    if (configureEnvBrowseBtn) {
        configureEnvBrowseBtn.addEventListener('click', browseConfigureEnvPath);
    }
    if (configureEnvDetectBtn) {
        configureEnvDetectBtn.addEventListener('click', startConfigureEnvDetect);
    }
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
    if (configureEnvSaveBtn) {
        configureEnvSaveBtn.addEventListener('click', saveConfigureEnvPath);
    }
    if (configureEnvCancelBtn) {
        configureEnvCancelBtn.addEventListener('click', closeConfigureEnvModal);
    }
    if (configureEnvCloseBtn) {
        configureEnvCloseBtn.addEventListener('click', closeConfigureEnvModal);
    }
    if (configureEnvSystemBtn) {
        configureEnvSystemBtn.addEventListener('click', requestConfigureEnvSystemPath);
    }
    if (configureEnvModal) {
        configureEnvModal.addEventListener('click', function(e) {
            if (e.target === configureEnvModal) {
                closeConfigureEnvModal();
            }
        });
    }
}
`,
);

write(
    'detect-environment/bind-events.js',
    `import { vscode } from '../core/vscode.js';
import {
    detectEnvDetailsOpen,
    setDetectEnvDetailsOpen,
} from './toolbar.js';

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
            e.preventDefault();
            e.stopPropagation();
            vscode.postMessage({ type: 'detectEnvironmentDismiss' });
        });
    }
    if (detectEnvBtn) {
        detectEnvBtn.addEventListener('click', doDetectEnvironment);
    }
}
`,
);

write(
    'bridge/message-bridge.js',
    `/**
 * @param {Record<string, (msg: Record<string, unknown>) => void>} handlers
 */
export function initMessageBridge(handlers) {
    window.addEventListener('message', function(event) {
        const msg = event.data;
        const handler = handlers[msg.type];
        if (handler) {
            handler(msg);
        }
    });
}
`,
);

write(
    'bridge/handlers/environment.js',
    `import { getLocale } from '../../core/locale.js';
import {
    finishDetectEnvironmentPanel,
    initDetectEnvironmentStart,
    updateDetectEnvironmentStep,
} from '../../detect-environment/toolbar.js';
import { setDetectEnvIcon } from '../../detect-environment/steps.js';
import {
    closeConfigureEnvModal,
    configureEnvDetectCompactIcon,
    configureEnvDetectCompactText,
    configureEnvPathInput,
    configureEnvSelectedPath,
    finishConfigureEnvDetect,
    hideConfigureEnvDetectProgress,
    openConfigureEnvModal,
    setConfigureEnvDetecting,
    showConfigureEnvDetectPanel,
    updateConfigureEnvDetectProgress,
    updateConfigureEnvPathClearVisibility,
} from '../../configure-environment/index.js';

/**
 * @param {{ placeholder: HTMLElement | null }} deps
 */
export function createEnvironmentHandlers(deps) {
    return {
        detectEnvironmentStart(msg) {
            initDetectEnvironmentStart(msg.mode || 'manual');
            if (deps.placeholder) {
                deps.placeholder.style.display = 'none';
            }
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
            if (msg.path && configureEnvPathInput) {
                configureEnvPathInput.value = msg.path;
                configureEnvSelectedPath = msg.path;
                updateConfigureEnvPathClearVisibility();
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

// --- Slim chat-app.js: remove extracted ranges, add imports ---
const header = `import { vscode } from './core/vscode.js';
import { getLocale, setLocale } from './core/locale.js';
import { buildFaqAccordion } from './locale/faq.js';
import { basenameFromPath } from './utils/path.js';
import {
    DETECT_STEP_IDS,
    detectStepLabel,
    formatDetectProgressDisplay,
    refreshDetectStepLabels,
    setDetectEnvIcon,
} from './detect-environment/steps.js';
import {
    detectEnvDetailsOpen,
    detectEnvPanelReady,
    finishDetectEnvironmentPanel,
    initDetectEnvironmentStart,
    setDetectEnvDetailsOpen,
    setDetectEnvDetailsTitle,
    updateDetectEnvironmentStep,
} from './detect-environment/toolbar.js';
import { bindDetectToolbarEvents, doDetectEnvironment } from './detect-environment/bind-events.js';
import {
    configureEnvBrowseBtn,
    configureEnvCancelBtn,
    configureEnvCloseBtn,
    configureEnvDetectBtn,
    configureEnvDetectCompactIcon,
    configureEnvDetectCompactText,
    configureEnvDetectSteps,
    configureEnvDetectToggle,
    configureEnvModal,
    configureEnvPathClearBtn,
    configureEnvPathInput,
    configureEnvSaveBtn,
    configureEnvSystemBtn,
    closeConfigureEnvModal,
    configureEnvDetectDetailsOpen,
    openConfigureEnvModal,
    setConfigureEnvDetectDetailsOpen,
    setConfigureEnvDetectDetailsTitle,
    updateConfigureEnvPathClearVisibility,
    updateConfigureEnvSystemHint,
} from './configure-environment/index.js';
import { bindConfigureEnvEvents } from './configure-environment/bind-events.js';
import { initMessageBridge } from './bridge/message-bridge.js';
import { createEnvironmentHandlers } from './bridge/handlers/environment.js';

let locale = getLocale();

`;

const removed = removeRanges([
    [1, 2], // old locale + blank
    [79, 685], // detect + configure + faq
    [687, 726], // faq (duplicate if 687-685 included faq start - 685 is requestConfigureEnvSystemPath end, 687 is buildFaq)
]);

// Fix: range [79,685] includes up to requestConfigureEnvSystemPath, [687,726] is faq only
// Re-do removal properly
const removed2 = removeRanges([
    [1, 2],
    [79, 726],
]);

let body = removed2.join('\n');

// Replace locale assignments with getLocale/setLocale in applyLocale handler
body = body.replace(
    /let locale = window\.__HERMES_LOCALE__ \|\| \{\};/,
    '',
);
body = body.replace(
    /const vscode = acquireVsCodeApi\(\);/,
    '',
);

// Replace message listener switch cases for environment with bridge init
const switchStart = body.indexOf('window.addEventListener(\'message\', function(event) {');
const switchEnd = body.lastIndexOf('});') ;
// Too fragile - replace specific cases with comments and add bridge at end

// Remove environment switch cases
const envCases = [
    "            case 'detectEnvironmentStart':",
    "            case 'detectEnvironmentProgress':",
    "            case 'detectEnvironmentEnd':",
    "            case 'configureEnvironmentOpen':",
    "            case 'configureEnvironmentDetectStart':",
    "            case 'configureEnvironmentDetectProgress':",
    "            case 'configureEnvironmentDetectEnd':",
    "            case 'configureEnvironmentDetectClosed':",
    "            case 'configureEnvironmentBrowseResult':",
    "            case 'configureEnvironmentSaveResult':",
];

for (const caseLine of envCases) {
    const idx = body.indexOf(caseLine);
    if (idx === -1) continue;
    let depth = 0;
    let end = idx;
    let started = false;
    for (let i = idx; i < body.length; i++) {
        if (body.slice(i, i + 5) === 'case ') started = true;
        if (body[i] === '{') depth++;
        if (body[i] === '}') {
            depth--;
            if (started && depth === 0 && body.slice(i, i + 7) === 'break;') {
                end = body.indexOf('\n', i + 7) + 1;
                break;
            }
        }
    }
    // simpler: remove line blocks manually via regex
}

// Use regex for each case block
body = body.replace(
    /\n            case 'detectEnvironmentStart':[\s\S]*?break;\n/,
    '\n',
);
body = body.replace(
    /\n            case 'detectEnvironmentProgress':[\s\S]*?break;\n/,
    '\n',
);
body = body.replace(
    /\n            case 'detectEnvironmentEnd':[\s\S]*?break;\n/,
    '\n',
);
body = body.replace(
    /\n            case 'configureEnvironmentOpen':[\s\S]*?break;\n/,
    '\n',
);
body = body.replace(
    /\n            case 'configureEnvironmentDetectStart':[\s\S]*?break;\n/,
    '\n',
);
body = body.replace(
    /\n            case 'configureEnvironmentDetectProgress':[\s\S]*?break;\n/,
    '\n',
);
body = body.replace(
    /\n            case 'configureEnvironmentDetectEnd':[\s\S]*?break;\n/,
    '\n',
);
body = body.replace(
    /\n            case 'configureEnvironmentDetectClosed':[\s\S]*?break;\n/,
    '\n',
);
body = body.replace(
    /\n            case 'configureEnvironmentBrowseResult':[\s\S]*?break;\n/,
    '\n',
);
body = body.replace(
    /\n            case 'configureEnvironmentSaveResult':[\s\S]*?break;\n/,
    '\n',
);

// Remove configure env event bindings block (will use bindConfigureEnvEvents)
body = body.replace(
    /\n    if \(configureEnvBrowseBtn\) \{[\s\S]*?configureEnvModal\.addEventListener\('click', function\(e\) \{[\s\S]*?\}\);\n    \}\n/,
    '\n    bindConfigureEnvEvents();\n',
);

// Remove duplicate detect toolbar bindings - replace with bindDetectToolbarEvents
body = body.replace(
    /\n    const detectEnvToggle = document\.getElementById\('detectEnvToggle'\);[\s\S]*?detectEnvBtn\.addEventListener\('click', doDetectEnvironment\);\n    \}/,
    '\n    bindDetectToolbarEvents(detectEnvBtn, document.getElementById(\'detectEnvClose\'));',
);

// Remove duplicate doDetectEnvironment function if present
body = body.replace(/\n    function doDetectEnvironment\(\) \{[\s\S]*?\n    \}\n/, '\n');

// Remove duplicate escapeHtml and basenameFromPath
body = body.replace(/\n    function escapeHtml\(s\) \{[\s\S]*?\n    \}\n/, '\n');
body = body.replace(/\n    function basenameFromPath\(filePath\) \{[\s\S]*?\n    \}\n/, '\n');

// Fix setLocale in setLocale case
body = body.replace(
    /locale = msg\.locale;/,
    'setLocale(msg.locale);\n                    locale = getLocale();',
);

// Add bridge registration before applyLocale at end
body = body.replace(
    /(\n    \/\/ Signal ready\n    applyLocale\(\);)/,
    `
    initMessageBridge({
        ...createEnvironmentHandlers({ placeholder }),
        ...window.__hermesMessageHandlers,
    });
$1`,
);

// Convert switch to handler map - replace window.addEventListener message block
// For step 2: keep switch but environment cases removed; later convert full switch
// Actually we need handlers for ALL cases - keep switch for now, only env cases removed

// Store remaining switch handlers on window for bridge merge - too hacky

// Better: replace entire message listener with handler builder at end of file
const messageListenerMatch = body.match(
    /window\.addEventListener\('message', function\(event\) \{[\s\S]*?\n    \}\);\n/,
);

if (messageListenerMatch) {
    const listenerBody = messageListenerMatch[0];
    // Extract cases into handler object string - for step 2 keep switch inside a function registerAppHandlers
    body = body.replace(
        listenerBody,
        `window.__hermesRegisterMessageHandlers = function(handlers) {
        window.addEventListener('message', function(event) {
            const msg = event.data;
            const handler = handlers[msg.type];
            if (handler) {
                handler(msg);
                return;
            }
            switch (msg.type) {
${listenerBody
    .replace(/window\.addEventListener\('message', function\(event\) \{[\s\S]*?switch \(msg\.type\) \{/, '')
    .replace(/\n        \}\n    \}\);\n$/, '\n            default:\n                break;\n            }\n        });\n    };\n')}
`,
    );
}

// Append init at end
body = body.replace(
    /(\n    applyLocale\(\);\n    vscode\.postMessage\(\{ type: 'ready' \}\);)/,
    `$1

    const appHandlers = {};
    const switchFn = window.__hermesRegisterMessageHandlers;
    if (switchFn) {
        switchFn(appHandlers);
    }
    initMessageBridge({
        ...createEnvironmentHandlers({ placeholder }),
    });`,
);

fs.writeFileSync(chatAppPath, header + body);

console.log('Step 2 split complete. Run npm run build:webview to verify.');
