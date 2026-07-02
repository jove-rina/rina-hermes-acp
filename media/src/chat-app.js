import { vscode } from './core/vscode.js';
import { setLocale } from './core/locale.js';
import {
    initInputHeight,
    setupInputResize,
    bindInputHeightResizeListener,
} from './input/height.js';
import { createSessionState } from './core/session-state.js';
import { bootstrapApp } from './app/bootstrap.js';

let placeholder = document.getElementById('placeholder');
const detectEnvBtn = document.getElementById('detectEnvBtn');

initInputHeight();
setupInputResize();
bindInputHeightResizeListener();

const session = createSessionState();
session.initScrollBehavior();

const { applyLocale } = bootstrapApp({
    session,
    getPlaceholder: () => placeholder,
    setPlaceholder: (el) => { placeholder = el; },
    detectEnvBtn,
    setLocale,
});

applyLocale();
vscode.postMessage({ type: 'ready' });
