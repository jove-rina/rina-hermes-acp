import { messagesEl, RESTORE_BATCH_SIZE } from '../core/dom-refs.js';
import { escapeHtml } from '../utils/escape-html.js';

/** @param {Record<string, Function>} deps */
export function createChatReset(deps) {
    function resetChatView() {
        deps.cancelSessionMarkdownRender();
        deps.clearChatSearch();
        deps.exitMultiSelectMode();
        deps.removeLocalHistoryDivider();
        deps.forceHideContextAttachPicker();
        const locale = deps.getLocale();
        messagesEl.innerHTML = '<div class="placeholder" id="placeholder">' + escapeHtml(locale.readyPlaceholder) + '</div>';
        deps.setPlaceholder(document.getElementById('placeholder'));
        deps.resetStreamingState();
        deps.clearToolState();
        deps.resetSessionIndex();
        deps.resetToolAggregation();
        deps.clearPendingPermissions();
        window._hermesRendered = false;
        deps.updateQuickActionBtns();
        deps.updateTokenUsage(0, 0);
        deps.setInputMode(deps.getCanSend() ? 'send' : 'disabled');
    }

    function newChat() {
        resetChatView();
    }

    function clearChat() {
        resetChatView();
    }

    function restoreHistory(messages, localHistoryOnly) {
        deps.cancelSessionMarkdownRender();
        deps.resetStreamingState();
        deps.clearToolState();
        deps.resetSessionIndex();
        deps.resetToolAggregation();
        deps.clearPendingPermissions();
        window._hermesRendered = false;
        deps.exitMultiSelectMode();
        if (!messages || messages.length === 0) {
            deps.removeLocalHistoryDivider();
            return;
        }
        deps.getPlaceholder().style.display = 'none';
        let cursor = 0;
        function appendRestoreBatch() {
            const end = Math.min(cursor + RESTORE_BATCH_SIZE, messages.length);
            for (; cursor < end; cursor++) {
                const m = messages[cursor];
                if (m.role === 'permission') {
                    deps.restorePermissionMessage(m);
                } else {
                    deps.addMessage(m.role, m.text, { restore: true, deferMarkdown: true });
                }
            }
            if (cursor < messages.length) {
                requestAnimationFrame(appendRestoreBatch);
                return;
            }
            deps.updateQuickActionBtns();
            if (localHistoryOnly) {
                deps.insertLocalHistoryDivider();
            } else {
                deps.removeLocalHistoryDivider();
            }
            deps.scheduleSessionMarkdownRender();
        }
        requestAnimationFrame(appendRestoreBatch);
    }

    return { resetChatView, newChat, clearChat, restoreHistory };
}
