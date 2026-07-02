import { vscode } from '../core/vscode.js';
import {
    messagesEl,
    inputEl,
    clearChatBtn,
    copySessionBtn,
    clearInputBtn,
    chatSearchInput,
    quickToggleBtn,
    inputQuickPanel,
} from '../core/dom-refs.js';

/** @param {Record<string, Function>} deps */
export function createQuickActions(deps) {
    function updateQuickActionBtns() {
        const hasMessages = messagesEl.querySelectorAll('.message-group').length > 0;
        const hasInput = !!inputEl.value.trim();
        if (clearChatBtn) clearChatBtn.disabled = !hasMessages;
        if (copySessionBtn) copySessionBtn.disabled = !hasMessages;
        if (clearInputBtn) clearInputBtn.disabled = !hasInput;
        if (chatSearchInput) chatSearchInput.disabled = !hasMessages;
        if (!hasMessages) deps.clearChatSearch();
        else if (chatSearchInput && chatSearchInput.value.trim()) deps.scheduleChatSearch();
    }

    function flashQuickActionBtn(btn, className, duration) {
        if (!btn) return;
        btn.classList.add(className || 'copied');
        setTimeout(function() {
            btn.classList.remove(className || 'copied');
        }, duration || 1500);
    }

    function setQuickPanelOpen(open) {
        const locale = deps.getLocale();
        if (!inputQuickPanel || !quickToggleBtn) return;
        inputQuickPanel.classList.toggle('open', open);
        inputQuickPanel.setAttribute('aria-hidden', open ? 'false' : 'true');
        quickToggleBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
        quickToggleBtn.title = open ? locale.quickActionsCollapse : locale.quickActionsExpand;
        if (open && chatSearchInput && !chatSearchInput.disabled) {
            setTimeout(function() { chatSearchInput.focus(); }, 280);
        }
    }

    function toggleQuickPanel() {
        setQuickPanelOpen(!inputQuickPanel.classList.contains('open'));
    }

    function appendToInput(text) {
        if (!text) return;
        deps.hideFilePicker();
        const val = inputEl.value;
        const needsSep = val.length > 0 && !/\n$/.test(val);
        inputEl.value = val + (needsSep ? '\n' : '') + text;
        if (!inputEl.disabled) {
            const pos = inputEl.value.length;
            inputEl.setSelectionRange(pos, pos);
            deps.syncInputHeightFromContent();
            updateQuickActionBtns();
            inputEl.focus();
        }
    }

    function insertIntoInput(text) {
        if (!text) return;
        deps.hideFilePicker();
        const val = inputEl.value;
        const start = typeof inputEl.selectionStart === 'number' ? inputEl.selectionStart : val.length;
        const end = typeof inputEl.selectionEnd === 'number' ? inputEl.selectionEnd : start;
        inputEl.value = val.slice(0, start) + text + val.slice(end);
        if (!inputEl.disabled) {
            const pos = start + text.length;
            inputEl.setSelectionRange(pos, pos);
            deps.syncInputHeightFromContent();
            updateQuickActionBtns();
            inputEl.focus();
        }
    }

    function insertToEditor(text) {
        if (!text) return;
        vscode.postMessage({ type: 'insertEditor', text: text });
    }

    function bindQuickActionEvents() {
        if (quickToggleBtn) {
            quickToggleBtn.addEventListener('click', toggleQuickPanel);
        }
        if (clearChatBtn) {
            clearChatBtn.addEventListener('click', function() {
                if (clearChatBtn.disabled) return;
                vscode.postMessage({ type: 'clearChat' });
            });
        }
    }

    return {
        updateQuickActionBtns,
        flashQuickActionBtn,
        appendToInput,
        insertIntoInput,
        insertToEditor,
        bindQuickActionEvents,
    };
}
