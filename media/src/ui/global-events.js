import { vscode } from '../core/vscode.js';
import { tabContextMenu, newChatBtn } from '../core/dom-refs.js';
import { detectEnvDetailsOpen, setDetectEnvDetailsOpen } from '../detect-environment/toolbar.js';
import { bindDetectToolbarEvents } from '../detect-environment/bind-events.js';
import {
    configureEnvDetectDetailsOpen,
    configureEnvModal,
    closeConfigureEnvModal,
    setConfigureEnvDetectDetailsOpen,
    bindConfigureEnvEvents,
} from '../configure-environment/index.js';

/** @param {Record<string, Function>} deps */
export function bindGlobalEvents(deps) {
    window.addEventListener('scroll', function(e) {
        deps.hideContextAttachTooltip();
        if (deps.isContextAttachPreviewOpen() && deps.isInsideContextAttachPreview(e.target)) {
            return;
        }
        deps.hideContextAttachPreview();
    }, true);

    document.addEventListener('click', function(e) {
        if (!e.target.closest('.insert-dropdown')) {
            deps.closeInsertDropdowns();
        }
        if (tabContextMenu && !e.target.closest('.tab-context-menu')) {
            deps.hideTabContextMenu();
        }
        if (detectEnvDetailsOpen && !e.target.closest('.detect-env-bar')) {
            setDetectEnvDetailsOpen(false);
            const detectToggle = document.getElementById('detectEnvToggle');
            if (detectToggle) detectToggle.setAttribute('aria-expanded', 'false');
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && tabContextMenu && !tabContextMenu.hidden) {
            deps.hideTabContextMenu();
        }
        if (e.key === 'Escape' && detectEnvDetailsOpen) {
            setDetectEnvDetailsOpen(false);
            const detectToggle = document.getElementById('detectEnvToggle');
            if (detectToggle) detectToggle.setAttribute('aria-expanded', 'false');
        }
        if (e.key === 'Escape' && configureEnvDetectDetailsOpen) {
            setConfigureEnvDetectDetailsOpen(false);
        }
        if (e.key === 'Escape' && configureEnvModal && configureEnvModal.classList.contains('is-open')) {
            closeConfigureEnvModal();
        }
    });

    bindDetectToolbarEvents(deps.detectEnvBtn, document.getElementById('detectEnvClose'));
    bindConfigureEnvEvents();

    if (newChatBtn) {
        newChatBtn.addEventListener('click', function() {
            vscode.postMessage({ type: 'newChat' });
        });
    }
}
