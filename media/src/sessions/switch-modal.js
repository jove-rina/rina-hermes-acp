import { vscode } from '../core/vscode.js';
import { showModal, hideModal } from '../ui/modal.js';

/** @param {Record<string, Function>} deps */
export function createSwitchSessionModal(deps) {
    const switchSessionModal = document.getElementById('switchSessionModal');
    let pendingSwitchSessionId = null;

    function openSwitchSessionModal(sessionId) {
        const locale = deps.getLocale();
        pendingSwitchSessionId = sessionId;
        const titleEl = document.getElementById('switchSessionModalTitle');
        const bodyEl = document.getElementById('switchSessionModalBody');
        const stayBtn = document.getElementById('switchSessionStayBtn');
        const confirmBtn = document.getElementById('switchSessionConfirmBtn');
        if (titleEl) titleEl.textContent = locale.switchSessionPromptTitle || '';
        if (bodyEl) bodyEl.textContent = locale.switchSessionPromptBody || '';
        if (stayBtn) stayBtn.textContent = locale.switchSessionStay || '';
        if (confirmBtn) confirmBtn.textContent = locale.switchSessionConfirm || '';
        showModal(switchSessionModal);
    }

    function closeSwitchSessionModal() {
        pendingSwitchSessionId = null;
        hideModal(switchSessionModal);
    }

    function requestSwitchSession(sessionId) {
        if (!sessionId || sessionId === deps.getActiveSessionId()) {
            return;
        }
        if (deps.getIsPrompting()) {
            openSwitchSessionModal(sessionId);
            return;
        }
        vscode.postMessage({ type: 'switchSession', sessionId: sessionId });
    }

    function bindSwitchSessionEvents() {
        const stayBtn = document.getElementById('switchSessionStayBtn');
        const confirmBtn = document.getElementById('switchSessionConfirmBtn');
        if (stayBtn) {
            stayBtn.addEventListener('click', closeSwitchSessionModal);
        }
        if (confirmBtn) {
            confirmBtn.addEventListener('click', function() {
                if (!pendingSwitchSessionId) {
                    closeSwitchSessionModal();
                    return;
                }
                const sessionId = pendingSwitchSessionId;
                closeSwitchSessionModal();
                vscode.postMessage({ type: 'switchSession', sessionId: sessionId, interrupt: true });
            });
        }
        if (switchSessionModal) {
            switchSessionModal.addEventListener('click', function(e) {
                if (e.target === switchSessionModal) {
                    closeSwitchSessionModal();
                }
            });
        }
    }

    return { requestSwitchSession, bindSwitchSessionEvents };
}
