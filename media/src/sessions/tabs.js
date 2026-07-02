import { vscode } from '../core/vscode.js';
import { tabBar, tabContextMenu } from '../core/dom-refs.js';
import { escapeHtml } from '../utils/escape-html.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { COPY_ICON_SVG, TAB_PIN_SVG } from '../ui/icons.js';

/** @param {Record<string, Function>} deps */
export function createSessionTabs(deps) {
    let editingSessionId = null;
    let tabContextSessionId = null;

    function startTabRename(tab, sessionId) {
        const locale = deps.getLocale();
        if (!tab || tab.classList.contains('editing')) {
            return;
        }
        tab.classList.add('editing');
        tab.draggable = false;
        editingSessionId = sessionId;
        const titleEl = tab.querySelector('.tab-title');
        if (!titleEl) {
            return;
        }
        const previousTitle = titleEl.textContent || locale.newChat;
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tab-title-input';
        input.value = previousTitle;
        input.maxLength = 80;
        titleEl.replaceWith(input);
        input.focus();
        input.select();

        let finished = false;
        function finish(commit) {
            if (finished) {
                return;
            }
            finished = true;
            editingSessionId = null;
            tab.classList.remove('editing');
            const newTitle = input.value.trim() || locale.newChat;
            const span = document.createElement('span');
            span.className = 'tab-title';
            span.textContent = commit ? newTitle : previousTitle;
            input.replaceWith(span);
            tab.draggable = true;
            if (commit) {
                vscode.postMessage({ type: 'renameSession', sessionId: sessionId, title: newTitle });
            }
        }

        input.addEventListener('keydown', function(e) {
            e.stopPropagation();
            if (e.key === 'Enter') {
                e.preventDefault();
                finish(true);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                finish(false);
            }
        });
        input.addEventListener('blur', function() {
            finish(true);
        });
        input.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    function renderSessionTabs(sessions, activeId) {
        const locale = deps.getLocale();
        deps.setActiveSessionId(activeId || deps.getActiveSessionId());
        deps.setLastSessions(sessions || []);
        deps.setLastActiveSessionId(deps.getActiveSessionId());
        if (editingSessionId) {
            return;
        }
        if (!sessions || sessions.length === 0) {
            tabBar.innerHTML = '';
            return;
        }
        const activeSessionId = deps.getActiveSessionId();
        const parts = [];
        sessions.forEach(function(s, index) {
            const active = s.id === activeSessionId ? ' active' : '';
            const pinnedClass = s.pinned ? ' pinned' : '';
            const title = escapeHtml(s.title || locale.newChat);
            const pinIcon = s.pinned
                ? '<span class="tab-pin-icon" title="' + escapeHtml(locale.tabContextPin) + '">' + TAB_PIN_SVG + '</span>'
                : '';
            parts.push('<div class="session-tab' + active + pinnedClass + '" data-id="' + escapeHtml(s.id) + '" title="' + title + '">' +
                pinIcon +
                '<span class="tab-title">' + title + '</span>' +
                '<span class="tab-close" data-id="' + escapeHtml(s.id) + '" title="' + escapeHtml(locale.tabClose) + '">×</span>' +
                '</div>');
            if (s.pinned && index < sessions.length - 1 && !sessions[index + 1].pinned) {
                parts.push('<span class="tab-pin-separator" aria-hidden="true"></span>');
            }
        });
        tabBar.innerHTML = parts.join('');

        tabBar.querySelectorAll('.session-tab').forEach(function(tab) {
            tab.addEventListener('click', function(e) {
                if (e.target && e.target.closest && e.target.closest('.tab-close')) {
                    return;
                }
                if (tab.classList.contains('editing')) {
                    return;
                }
                if (tab.dataset.id !== deps.getActiveSessionId()) {
                    deps.requestSwitchSession(tab.dataset.id);
                }
            });
            tab.addEventListener('dblclick', function(e) {
                if (e.target && e.target.closest && e.target.closest('.tab-close')) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                startTabRename(tab, tab.dataset.id);
            });
            tab.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showTabContextMenu(tab.dataset.id, e.clientX, e.clientY);
            });
            wireTabDragDrop(tab);
        });
        tabBar.querySelectorAll('.tab-close').forEach(function(btn) {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                vscode.postMessage({ type: 'deleteSession', sessionId: btn.dataset.id });
            });
        });

        const activeTab = tabBar.querySelector('.session-tab.active');
        if (activeTab) {
            activeTab.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
    }

    function reorderSessionTabs(fromId, toId) {
        const lastSessions = deps.getLastSessions();
        if (!fromId || !toId || fromId === toId || !lastSessions.length) {
            return;
        }
        const fromSession = lastSessions.find(function(s) { return s.id === fromId; });
        const toSession = lastSessions.find(function(s) { return s.id === toId; });
        if (!fromSession || !toSession) {
            return;
        }
        if (!!fromSession.pinned !== !!toSession.pinned) {
            return;
        }
        const ids = lastSessions.map(function(s) { return s.id; });
        const fromIdx = ids.indexOf(fromId);
        const toIdx = ids.indexOf(toId);
        if (fromIdx < 0 || toIdx < 0) {
            return;
        }
        ids.splice(fromIdx, 1);
        ids.splice(toIdx, 0, fromId);
        const byId = {};
        lastSessions.forEach(function(s) { byId[s.id] = s; });
        const reordered = ids.map(function(id) { return byId[id]; }).filter(Boolean);
        deps.setLastSessions(reordered);
        renderSessionTabs(reordered, deps.getLastActiveSessionId());
        vscode.postMessage({ type: 'reorderSessions', sessionIds: ids });
    }

    function hideTabContextMenu() {
        tabContextSessionId = null;
        if (tabContextMenu) {
            tabContextMenu.hidden = true;
            tabContextMenu.innerHTML = '';
        }
    }

    function positionTabContextMenu(x, y) {
        if (!tabContextMenu) return;
        tabContextMenu.hidden = false;
        tabContextMenu.style.left = '0px';
        tabContextMenu.style.top = '0px';
        const rect = tabContextMenu.getBoundingClientRect();
        const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
        const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
        tabContextMenu.style.left = Math.min(x, maxLeft) + 'px';
        tabContextMenu.style.top = Math.min(y, maxTop) + 'px';
    }

    function showTabContextMenu(sessionId, clientX, clientY) {
        const locale = deps.getLocale();
        const lastSessions = deps.getLastSessions();
        const session = lastSessions.find(function(s) { return s.id === sessionId; });
        if (!session || !tabContextMenu) {
            return;
        }
        tabContextSessionId = sessionId;
        const idx = lastSessions.findIndex(function(s) { return s.id === sessionId; });
        const canCloseLeft = idx > 0;
        const canCloseRight = idx >= 0 && idx < lastSessions.length - 1;
        const canCloseOthers = lastSessions.length > 1;
        const pinLabel = session.pinned ? locale.tabContextUnpin : locale.tabContextPin;

        tabContextMenu.innerHTML =
            '<div class="tab-ctx-sid">' +
                '<span class="tab-ctx-sid-label">' + escapeHtml(locale.tabContextSid) + ':</span>' +
                '<span class="tab-ctx-sid-value" title="' + escapeHtml(sessionId) + '">' + escapeHtml(sessionId) + '</span>' +
                '<button type="button" class="tab-ctx-sid-copy" data-action="copySid" title="' + escapeHtml(locale.copySid) + '">' + COPY_ICON_SVG + '</button>' +
            '</div>' +
            '<button type="button" class="tab-ctx-item" data-action="export">' + escapeHtml(locale.tabContextExport) + '</button>' +
            '<button type="button" class="tab-ctx-item" data-action="copy">' + escapeHtml(locale.tabContextCopy) + '</button>' +
            '<div class="tab-ctx-divider"></div>' +
            '<button type="button" class="tab-ctx-item" data-action="rename">' + escapeHtml(locale.tabContextRename) + '</button>' +
            '<button type="button" class="tab-ctx-item" data-action="close">' + escapeHtml(locale.tabContextClose) + '</button>' +
            '<button type="button" class="tab-ctx-item" data-action="closeOthers"' + (canCloseOthers ? '' : ' disabled') + '>' + escapeHtml(locale.tabContextCloseOthers) + '</button>' +
            '<button type="button" class="tab-ctx-item" data-action="closeLeft"' + (canCloseLeft ? '' : ' disabled') + '>' + escapeHtml(locale.tabContextCloseLeft) + '</button>' +
            '<button type="button" class="tab-ctx-item" data-action="closeRight"' + (canCloseRight ? '' : ' disabled') + '>' + escapeHtml(locale.tabContextCloseRight) + '</button>' +
            '<button type="button" class="tab-ctx-item" data-action="closeAll">' + escapeHtml(locale.tabContextCloseAll) + '</button>' +
            '<div class="tab-ctx-divider"></div>' +
            '<button type="button" class="tab-ctx-item" data-action="togglePin">' + escapeHtml(pinLabel) + '</button>';

        tabContextMenu.querySelector('[data-action="copySid"]').addEventListener('click', function(e) {
            e.stopPropagation();
            copyToClipboard(sessionId);
        });
        tabContextMenu.querySelectorAll('.tab-ctx-item[data-action]').forEach(function(item) {
            item.addEventListener('click', function(e) {
                e.stopPropagation();
                if (item.disabled || !tabContextSessionId) return;
                const action = item.dataset.action;
                const targetId = tabContextSessionId;
                hideTabContextMenu();
                if (action === 'export') {
                    deps.requestSessionExport('export', undefined, targetId);
                } else if (action === 'copy') {
                    deps.requestSessionExport('copy', undefined, targetId);
                } else if (action === 'rename') {
                    const tab = tabBar.querySelector('.session-tab[data-id="' + targetId + '"]');
                    if (tab) startTabRename(tab, targetId);
                } else if (action === 'togglePin') {
                    vscode.postMessage({ type: 'togglePinSession', sessionId: targetId });
                } else if (action === 'close' || action === 'closeOthers' || action === 'closeLeft' || action === 'closeRight' || action === 'closeAll') {
                    const mode = action === 'close' ? 'self'
                        : action === 'closeOthers' ? 'others'
                        : action === 'closeLeft' ? 'left'
                        : action === 'closeRight' ? 'right'
                        : 'all';
                    vscode.postMessage({ type: 'closeSessions', sessionId: targetId, mode: mode });
                }
            });
        });

        positionTabContextMenu(clientX, clientY);
    }

    function wireTabDragDrop(tab) {
        tab.draggable = true;
        tab.addEventListener('dragstart', function(e) {
            if (tab.classList.contains('editing')) {
                e.preventDefault();
                return;
            }
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', tab.dataset.id || '');
            tab.classList.add('dragging');
        });
        tab.addEventListener('dragend', function() {
            tab.classList.remove('dragging');
            tabBar.querySelectorAll('.session-tab').forEach(function(t) {
                t.classList.remove('drag-over');
            });
        });
        tab.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            tab.classList.add('drag-over');
        });
        tab.addEventListener('dragleave', function() {
            tab.classList.remove('drag-over');
        });
        tab.addEventListener('drop', function(e) {
            e.preventDefault();
            e.stopPropagation();
            tab.classList.remove('drag-over');
            const fromId = e.dataTransfer.getData('text/plain');
            reorderSessionTabs(fromId, tab.dataset.id);
        });
        tab.addEventListener('mousedown', function(e) {
            tab.draggable = !(e.target && e.target.closest && e.target.closest('.tab-close'));
        });
    }

    return { renderSessionTabs, hideTabContextMenu };
}
