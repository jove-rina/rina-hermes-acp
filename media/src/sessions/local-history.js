import { messagesEl, LOCAL_HISTORY_DIVIDER_ID } from '../core/dom-refs.js';

/** @param {Record<string, Function>} deps */
export function createLocalHistory(deps) {
    function removeLocalHistoryDivider() {
        const divider = document.getElementById(LOCAL_HISTORY_DIVIDER_ID);
        if (divider) divider.remove();
    }

    function insertLocalHistoryDivider() {
        const locale = deps.getLocale();
        const placeholder = deps.getPlaceholder();
        removeLocalHistoryDivider();
        const divider = document.createElement('div');
        divider.id = LOCAL_HISTORY_DIVIDER_ID;
        divider.className = 'local-history-divider';
        divider.title = locale.localHistoryDividerTitle || '';
        divider.textContent = locale.localHistoryDivider || '';
        placeholder.style.display = 'none';
        messagesEl.appendChild(divider);
    }

    function setConnectingPlaceholder() {
        const locale = deps.getLocale();
        const placeholder = deps.getPlaceholder();
        if (!placeholder) return;
        placeholder.className = 'placeholder';
        placeholder.textContent = '';
        placeholder.appendChild(document.createTextNode(locale.connectingTitle || ''));
        placeholder.appendChild(document.createElement('br'));
        const hint = document.createElement('span');
        hint.style.fontSize = '11px';
        hint.style.opacity = '0.6';
        hint.textContent = locale.connectingHint || '';
        placeholder.appendChild(hint);
    }

    return {
        removeLocalHistoryDivider,
        insertLocalHistoryDivider,
        setConnectingPlaceholder,
    };
}
