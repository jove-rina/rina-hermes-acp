import { vscode } from '../core/vscode.js';
import {
    messagesEl,
    inputEl,
    sendBtn,
    inputCompositeEl,
    inputCompositeShellEl,
} from '../core/dom-refs.js';
import { resetAutoScrollFollow } from '../messages/scroll.js';

/** @param {Record<string, Function>} deps */
export function createSend(deps) {
    function executeSendMessage(text, attachOverride) {
        deps.hideFilePicker();
        resetAutoScrollFollow();
        deps.addMessage('user', text);
        inputEl.value = '';
        deps.syncInputHeightFromContent();
        deps.updateQuickActionBtns();
        inputEl.disabled = true;
        deps.setAwaitingFirstChunk(true);
        deps.setInputMode('waiting');

        const payload = attachOverride !== undefined
            ? attachOverride
            : deps.buildContextAttachPayload(false);
        vscode.postMessage({
            type: 'sendMessage',
            text: text,
            contextAttach: payload,
        });
    }

    function sendMessage() {
        const text = inputEl.value.trim();
        if (!text || !deps.getCanSend()) return;

        if (deps.hasUnconfirmedCustomMemorySelection()) {
            deps.openContextAttachSendModal(text);
            return;
        }

        executeSendMessage(text);
    }

    function bindSendEvents() {
        inputEl.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && deps.getMultiSelectMode()) {
                e.preventDefault();
                deps.exitMultiSelectMode();
                return;
            }
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
        sendBtn.addEventListener('click', sendMessage);
    }

    return { executeSendMessage, sendMessage, bindSendEvents };
}

/** @param {Record<string, Function>} deps */
export function createInputMode(deps) {
    const cancelBtn = document.getElementById('cancelBtn');

    function setInputMode(mode) {
        const waiting = mode === 'stop' || mode === 'waiting';
        if (inputCompositeEl) {
            inputCompositeEl.classList.toggle('waiting', waiting);
        }
        if (inputCompositeShellEl) {
            inputCompositeShellEl.classList.toggle('waiting', waiting);
        }
        if (mode === 'stop') {
            sendBtn.classList.add('hidden');
            cancelBtn.classList.remove('hidden');
            sendBtn.disabled = true;
        } else if (mode === 'waiting') {
            cancelBtn.classList.add('hidden');
            sendBtn.classList.remove('hidden');
            sendBtn.disabled = true;
        } else if (mode === 'send') {
            cancelBtn.classList.add('hidden');
            sendBtn.classList.remove('hidden');
            sendBtn.disabled = !deps.getCanSend();
        } else {
            cancelBtn.classList.add('hidden');
            sendBtn.classList.remove('hidden');
            sendBtn.disabled = true;
        }
    }

    return { setInputMode };
}
