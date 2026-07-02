import { vscode } from '../core/vscode.js';
import { inputEl } from '../core/dom-refs.js';
import { escapeHtml } from '../utils/escape-html.js';

/** @param {Record<string, Function>} deps */
export function createFileRefs(deps) {
    const filePickerEl = deps.filePickerEl;
    let mentionStart = -1;
    let filePickerVisible = false;
    let filePickerItems = [];
    let filePickerIndex = 0;
    let fileListRequestId = 0;
    let fileListDebounce = null;

    let previewTooltip = null;
    let previewHideTimer = null;
    let previewRequestId = 0;
    const previewRequests = new Map();

    function hideFilePreview() {
        if (previewHideTimer) {
            clearTimeout(previewHideTimer);
            previewHideTimer = null;
        }
        if (previewTooltip) {
            previewTooltip.remove();
            previewTooltip = null;
        }
    }

    function showFilePreview(path, content, error) {
        const locale = deps.getLocale();
        hideFilePreview();
        previewTooltip = document.createElement('div');
        previewTooltip.className = 'file-preview-tooltip';
        const header = document.createElement('div');
        header.className = 'fp-header';
        header.textContent = path;
        previewTooltip.appendChild(header);
        if (error) {
            const err = document.createElement('div');
            err.className = 'fp-error';
            err.textContent = error;
            previewTooltip.appendChild(err);
        } else {
            const pre = document.createElement('pre');
            pre.textContent = content || locale.emptyFile;
            previewTooltip.appendChild(pre);
        }
        document.body.appendChild(previewTooltip);
    }

    function positionFilePreview(anchor) {
        if (!previewTooltip || !anchor) return;
        const rect = anchor.getBoundingClientRect();
        const tip = previewTooltip.getBoundingClientRect();
        let top = rect.bottom + 6;
        let left = rect.left;
        if (top + tip.height > window.innerHeight - 8) {
            top = rect.top - tip.height - 6;
        }
        if (left + tip.width > window.innerWidth - 8) {
            left = window.innerWidth - tip.width - 8;
        }
        previewTooltip.style.top = Math.max(8, top) + 'px';
        previewTooltip.style.left = Math.max(8, left) + 'px';
    }

    function attachFileRefPreview(link) {
        if (link.dataset.previewReady) return;
        link.dataset.previewReady = '1';
        let enterTimer = null;
        link.addEventListener('mouseenter', function () {
            enterTimer = setTimeout(function () {
                const filePath = link.dataset.path || link.textContent.replace(/^@/, '');
                const reqId = String(++previewRequestId);
                previewRequests.set(reqId, link);
                vscode.postMessage({ type: 'previewFile', path: filePath, requestId: reqId });
            }, 250);
        });
        link.addEventListener('mouseleave', function () {
            if (enterTimer) clearTimeout(enterTimer);
            previewHideTimer = setTimeout(hideFilePreview, 150);
        });
    }

    function processFileRefs(container) {
        const locale = deps.getLocale();
        if (!container) return;
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
        const nodesToReplace = [];
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.parentElement && node.parentElement.closest('pre, code, a.file-ref')) continue;
            const text = node.textContent || '';
            const refRegex = /@([\w./\\\-]+(?:\.[a-zA-Z0-9]+)?)/g;
            let match;
            let lastIdx = 0;
            const parts = [];
            while ((match = refRegex.exec(text)) !== null) {
                const before = text.slice(lastIdx, match.index);
                if (before) parts.push(document.createTextNode(before));
                const link = document.createElement('a');
                link.href = '#';
                link.className = 'file-ref';
                link.textContent = match[0];
                link.title = locale.fileLinkTitle;
                link.dataset.path = match[1];
                link.addEventListener('click', function (e) {
                    e.preventDefault();
                    vscode.postMessage({ type: 'openFile', path: match[1] });
                });
                attachFileRefPreview(link);
                parts.push(link);
                lastIdx = match.index + match[0].length;
            }
            if (parts.length > 0) {
                const remaining = text.slice(lastIdx);
                if (remaining) parts.push(document.createTextNode(remaining));
                nodesToReplace.push({ node, parts });
            }
        }
        for (const { node, parts } of nodesToReplace) {
            const parent = node.parentNode;
            if (!parent) continue;
            const fragment = document.createDocumentFragment();
            parts.forEach(p => fragment.appendChild(p));
            parent.replaceChild(fragment, node);
        }
    }

    function hideFilePicker() {
        if (!filePickerEl) return;
        filePickerVisible = false;
        mentionStart = -1;
        filePickerItems = [];
        filePickerIndex = 0;
        filePickerEl.classList.remove('visible');
        filePickerEl.innerHTML = '';
    }

    function renderFilePickerItems(files) {
        const locale = deps.getLocale();
        filePickerItems = files || [];
        filePickerIndex = 0;
        filePickerEl.innerHTML = '';
        if (filePickerItems.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'file-picker-empty';
            empty.textContent = locale.noMatchingFiles;
            filePickerEl.appendChild(empty);
        } else {
            filePickerItems.forEach(function (filePath, idx) {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'file-picker-item' + (idx === 0 ? ' active' : '');
                btn.textContent = '@' + filePath;
                btn.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    selectFileMention(filePath);
                });
                filePickerEl.appendChild(btn);
            });
        }
        filePickerEl.classList.add('visible');
        filePickerVisible = true;
    }

    function updateFilePickerHighlight() {
        filePickerEl.querySelectorAll('.file-picker-item').forEach(function (el, idx) {
            el.classList.toggle('active', idx === filePickerIndex);
            if (idx === filePickerIndex) {
                el.scrollIntoView({ block: 'nearest' });
            }
        });
    }

    function selectFileMention(filePath) {
        if (mentionStart < 0) return;
        const val = inputEl.value;
        const before = val.slice(0, mentionStart);
        const after = val.slice(inputEl.selectionStart);
        const insertion = '@' + filePath + ' ';
        inputEl.value = before + insertion + after;
        const cursor = before.length + insertion.length;
        inputEl.setSelectionRange(cursor, cursor);
        deps.syncInputHeightFromContent();
        hideFilePicker();
        inputEl.focus();
    }

    function detectFileMention() {
        const locale = deps.getLocale();
        const val = inputEl.value;
        const pos = inputEl.selectionStart;
        const before = val.slice(0, pos);
        const match = before.match(/@([\w./\\\-]*)$/);
        if (!match) {
            hideFilePicker();
            return;
        }
        mentionStart = pos - match[0].length;
        const query = match[1] || '';
        if (fileListDebounce) clearTimeout(fileListDebounce);
        fileListDebounce = setTimeout(function () {
            const reqId = String(++fileListRequestId);
            filePickerEl.dataset.requestId = reqId;
            filePickerEl.innerHTML = '<div class="file-picker-empty">' + escapeHtml(locale.searchingFiles) + '</div>';
            filePickerEl.classList.add('visible');
            filePickerVisible = true;
            vscode.postMessage({ type: 'listFiles', query: query, requestId: reqId });
        }, 120);
    }

    function isFilePickerVisible() {
        return filePickerVisible;
    }

    function getFilePickerItems() {
        return filePickerItems;
    }

    function getFilePickerIndex() {
        return filePickerIndex;
    }

    function setFilePickerIndex(idx) {
        filePickerIndex = idx;
    }

    function getFilePickerRequestId() {
        return filePickerEl.dataset.requestId;
    }

    function bindFilePickerInputHandlers() {
        inputEl.addEventListener('input', function() {
            deps.syncInputHeightFromContent();
            detectFileMention();
            deps.updateQuickActionBtns();
        });
        inputEl.addEventListener('keydown', function(e) {
            if (filePickerVisible && filePickerItems.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    filePickerIndex = (filePickerIndex + 1) % filePickerItems.length;
                    updateFilePickerHighlight();
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    filePickerIndex = (filePickerIndex - 1 + filePickerItems.length) % filePickerItems.length;
                    updateFilePickerHighlight();
                    return;
                }
                if (e.key === 'Enter' || e.key === 'Tab') {
                    e.preventDefault();
                    selectFileMention(filePickerItems[filePickerIndex]);
                    return;
                }
            }
            if (e.key === 'Escape' && filePickerVisible) {
                e.preventDefault();
                hideFilePicker();
            }
        });
    }

    return {
        previewRequests,
        processFileRefs,
        hideFilePicker,
        hideFilePreview,
        showFilePreview,
        positionFilePreview,
        renderFilePickerItems,
        detectFileMention,
        isFilePickerVisible,
        getFilePickerItems,
        getFilePickerIndex,
        setFilePickerIndex,
        getFilePickerRequestId,
        bindFilePickerInputHandlers,
    };
}
