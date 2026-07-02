import { vscode } from '../core/vscode.js';
import { messagesEl } from '../core/dom-refs.js';

export function isSelectableRole(role) {
    return role === 'user' || role === 'assistant' || role === 'thought' || role === 'tool';
}

export function getGroupRoleLabel(group, locale) {
    if (group.classList.contains('user')) return locale.roleYou;
    if (group.classList.contains('assistant')) return locale.roleHermes;
    if (group.classList.contains('thought')) return locale.roleThought;
    if (group.classList.contains('tool')) return locale.roleTool;
    return locale.roleMessage;
}

export function downloadSessionMarkdown(markdown, filename) {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'chat-export.md';
    link.click();
    URL.revokeObjectURL(url);
}

/** @param {Record<string, Function>} deps */
export function createGroupUtils(deps) {
    function assignSessionIndex(group) {
        group.dataset.sessionIndex = String(deps.bumpSessionIndex());
    }

    function reindexSessionIndices() {
        deps.resetSessionIndex();
        messagesEl.querySelectorAll('.message-group').forEach(function(group) {
            assignSessionIndex(group);
        });
    }

    function getGroupMarkdownText(group) {
        if (group._auxState && group._auxState.rawText) {
            return group._auxState.rawText;
        }
        if (group._rawText) {
            return group._rawText;
        }
        return deps.getMessagePlainText(group);
    }

    function getGroupsPlainText(groups) {
        const locale = deps.getLocale();
        const lines = [];
        groups.forEach(function(group) {
            const role = getGroupRoleLabel(group, locale);
            const text = deps.getMessagePlainText(group).trim();
            if (!text) return;
            lines.push(role + ':\n' + text);
        });
        return lines.join('\n\n');
    }

    function getGroupsMarkdown(groups) {
        const locale = deps.getLocale();
        const parts = [];
        groups.forEach(function(group) {
            const role = getGroupRoleLabel(group, locale);
            const text = getGroupMarkdownText(group).trim();
            if (!text) return;
            parts.push('## ' + role + '\n\n' + text);
        });
        return parts.join('\n\n');
    }

    function getSessionPlainText() {
        const locale = deps.getLocale();
        const groups = messagesEl.querySelectorAll('.message-group');
        const lines = [];
        groups.forEach(function(group) {
            const role = getGroupRoleLabel(group, locale);
            const text = deps.getMessagePlainText(group).trim();
            if (!text) return;
            lines.push(role + ':\n' + text);
        });
        return lines.join('\n\n');
    }

    function requestSessionExport(action, indices, sessionId) {
        const sid = sessionId || deps.getLastActiveSessionId();
        if (!sid) return;
        vscode.postMessage({
            type: 'sessionExport',
            sessionId: sid,
            action: action,
            indices: indices && indices.length ? indices : undefined,
        });
    }

    return {
        assignSessionIndex,
        reindexSessionIndices,
        getGroupMarkdownText,
        getGroupsPlainText,
        getGroupsMarkdown,
        getSessionPlainText,
        requestSessionExport,
    };
}
