import { vscode } from '../core/vscode.js';
import { statusDot, statusText } from '../core/dom-refs.js';
import { escapeHtml } from '../utils/escape-html.js';
import { doDetectEnvironment } from '../detect-environment/bind-events.js';

/** @param {Record<string, Function>} deps */
export function createConnection(deps) {
    let connectionAttempted = false;
    const retryBtn = document.getElementById('retryBtn');
    const detectEnvBtn = document.getElementById('detectEnvBtn');

    function updateConnectionActionVisibility(status) {
        const showActions = status === 'error' || (status === 'idle' && connectionAttempted);
        if (retryBtn) {
            retryBtn.hidden = !showActions;
            retryBtn.disabled = status === 'connecting';
        }
        if (detectEnvBtn) {
            detectEnvBtn.hidden = !showActions;
            detectEnvBtn.disabled = status === 'connecting';
        }
    }

    function buildConnectionErrorPlaceholder(errText) {
        const locale = deps.getLocale();
        const placeholder = deps.getPlaceholder();
        if (placeholder) placeholder.className = 'placeholder';
        return escapeHtml(errText) +
            '<div class="connection-error-actions" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center">' +
            '<button type="button" class="retry-btn" id="placeholderRetryBtn">' + escapeHtml(locale.retryConnect) + '</button>' +
            '<button type="button" class="retry-btn" id="placeholderDetectEnvBtn">' + escapeHtml(locale.detectEnvironment) + '</button>' +
            '</div>';
    }

    function bindConnectionErrorActions() {
        const phRetry = document.getElementById('placeholderRetryBtn');
        if (phRetry) phRetry.addEventListener('click', doRetry);
        const phDetect = document.getElementById('placeholderDetectEnvBtn');
        if (phDetect) phDetect.addEventListener('click', doDetectEnvironment);
    }

    function doRetry() {
        if (retryBtn && retryBtn.disabled) return;
        connectionAttempted = true;
        vscode.postMessage({ type: 'retry' });
    }

    function updateStatus(status, message) {
        const locale = deps.getLocale();
        statusDot.className = 'dot ' + status;
        const labels = {
            idle: locale.statusDisconnected,
            connecting: locale.statusConnecting,
            ready: locale.statusReady,
            prompting: locale.statusThinking,
            error: locale.statusError,
        };
        let text = message || labels[status] || status;
        if (text.startsWith('Session:')) {
            text = labels[status] || status;
        }
        statusText.textContent = text;
        statusText.title = message || text;
        updateConnectionActionVisibility(status);
    }

    function bindConnectionEvents() {
        if (retryBtn) {
            retryBtn.addEventListener('click', doRetry);
        }
    }

    return {
        getConnectionAttempted: () => connectionAttempted,
        setConnectionAttempted: (v) => { connectionAttempted = v; },
        updateStatus,
        buildConnectionErrorPlaceholder,
        bindConnectionErrorActions,
        bindConnectionEvents,
    };
}
