import { copyToClipboard } from '../utils/clipboard.js';
import { showModal, hideModal } from '../ui/modal.js';

const LOG_SCROLL_BOTTOM_THRESHOLD = 24;
const LOG_SCROLL_IDLE_MS = 5000;

/** @param {Record<string, Function>} deps */
export function createLogViewer(deps) {
    let logs = [];
    const logFilterError = document.getElementById('logFilterError');
    const logFilterWarning = document.getElementById('logFilterWarning');
    const logModal = document.getElementById('logModal');
    const logContent = document.getElementById('logContent');
    const copyLogBtn = document.getElementById('copyLogBtn');
    let logScrollPinnedByUser = false;
    let logScrollIdleTimer = null;
    let copyLogResetTimer = null;

    function isLogModalOpen() {
        return !!(logModal && logModal.classList.contains('is-open'));
    }

    function isLogAtBottom() {
        if (!logContent) {
            return true;
        }
        return logContent.scrollHeight - logContent.scrollTop - logContent.clientHeight <= LOG_SCROLL_BOTTOM_THRESHOLD;
    }

    function maybeScrollLogToBottom(force) {
        if (!logContent) {
            return;
        }
        if (force || !logScrollPinnedByUser) {
            logContent.scrollTop = logContent.scrollHeight;
        }
    }

    function scheduleLogScrollReenable() {
        if (logScrollIdleTimer) {
            clearTimeout(logScrollIdleTimer);
        }
        logScrollIdleTimer = setTimeout(function() {
            logScrollIdleTimer = null;
            logScrollPinnedByUser = false;
            maybeScrollLogToBottom(true);
        }, LOG_SCROLL_IDLE_MS);
    }

    function onLogContentScroll() {
        if (!isLogModalOpen()) {
            return;
        }
        if (isLogAtBottom()) {
            logScrollPinnedByUser = false;
            if (logScrollIdleTimer) {
                clearTimeout(logScrollIdleTimer);
                logScrollIdleTimer = null;
            }
            return;
        }
        logScrollPinnedByUser = true;
        scheduleLogScrollReenable();
    }

    function resetLogAutoScrollFollow() {
        logScrollPinnedByUser = false;
        if (logScrollIdleTimer) {
            clearTimeout(logScrollIdleTimer);
            logScrollIdleTimer = null;
        }
    }

    function getVisibleLogText() {
        const showError = !logFilterError || logFilterError.checked;
        const showWarning = !logFilterWarning || logFilterWarning.checked;
        return logs
            .filter(function(entry) {
                if (entry.level === 'error') return showError;
                if (entry.level === 'warning') return showWarning;
                return false;
            })
            .map(function(entry) { return entry.line; })
            .join('\n');
    }

    function renderLogContent() {
        const locale = deps.getLocale();
        const showError = !logFilterError || logFilterError.checked;
        const showWarning = !logFilterWarning || logFilterWarning.checked;
        const visible = logs.filter(function(entry) {
            if (entry.level === 'error') return showError;
            if (entry.level === 'warning') return showWarning;
            return false;
        });
        if (!visible.length) {
            logContent.textContent = locale.noLogs;
            return;
        }
        logContent.textContent = '';
        for (const entry of visible) {
            const lineEl = document.createElement('div');
            lineEl.className = entry.level === 'error' ? 'log-line-error' : 'log-line-warning';
            lineEl.textContent = entry.line;
            logContent.appendChild(lineEl);
        }
        maybeScrollLogToBottom();
    }

    function openLogModal() {
        resetLogAutoScrollFollow();
        renderLogContent();
        showModal(logModal);
        maybeScrollLogToBottom(true);
    }

    function appendLog(line, level) {
        logs.push({ line, level });
        if (logs.length > 500) logs = logs.slice(-500);
        if (isLogModalOpen()) {
            renderLogContent();
        }
    }

    function bindLogViewerEvents() {
        if (copyLogBtn) {
            copyLogBtn.addEventListener('click', function() {
                const locale = deps.getLocale();
                const text = getVisibleLogText();
                if (!text) return;
                copyToClipboard(text).then(function() {
                    copyLogBtn.classList.add('copied');
                    const prevText = copyLogBtn.textContent;
                    copyLogBtn.textContent = locale.copied;
                    if (copyLogResetTimer) clearTimeout(copyLogResetTimer);
                    copyLogResetTimer = setTimeout(function() {
                        copyLogBtn.classList.remove('copied');
                        copyLogBtn.textContent = prevText || locale.copy;
                    }, 1500);
                });
            });
        }
        const closeLogBtn = document.getElementById('closeLogBtn');
        if (closeLogBtn) {
            closeLogBtn.addEventListener('click', function() {
                hideModal(logModal);
            });
        }
        const clearLogBtn = document.getElementById('clearLogBtn');
        if (clearLogBtn) {
            clearLogBtn.addEventListener('click', function() {
                logs = [];
                renderLogContent();
            });
        }
        if (logFilterError) logFilterError.addEventListener('change', renderLogContent);
        if (logFilterWarning) logFilterWarning.addEventListener('change', renderLogContent);
        if (logContent) {
            logContent.addEventListener('scroll', onLogContentScroll, { passive: true });
        }
    }

    return {
        openLogModal,
        appendLog,
        bindLogViewerEvents,
    };
}
