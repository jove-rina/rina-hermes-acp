import { messagesEl } from '../core/dom-refs.js';
import { renderMarkdown } from './markdown.js';
import { COPY_ICON_SVG, SELECT_ICON_SVG } from '../ui/icons.js';
import { copyToClipboard } from '../utils/clipboard.js';

/** @param {Record<string, Function>} deps */
export function createAddMessage(deps) {
    function getMessagePlainText(group) {
        const bubble = group.querySelector('.message') || group;
        const content = bubble.querySelector('.content');
        if (content) return content.textContent || '';
        const aux = bubble.querySelector('.aux-body-content');
        if (aux) return aux.textContent || '';
        return '';
    }

    function attachMessageActions(group, inner) {
        const locale = deps.getLocale();
        const actions = document.createElement('div');
        actions.className = 'message-actions';
        actions.addEventListener('click', function(e) { e.stopPropagation(); });

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'copy-btn action-btn';
        copyBtn.title = locale.copy;
        copyBtn.innerHTML = COPY_ICON_SVG;
        copyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const text = getMessagePlainText(group);
            if (!text) return;
            copyToClipboard(text).then(function() {
                copyBtn.classList.add('copied');
                copyBtn.title = locale.copied;
                setTimeout(function() {
                    copyBtn.classList.remove('copied');
                    copyBtn.title = locale.copy;
                }, 1500);
            });
        });
        actions.appendChild(copyBtn);

        const selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.className = 'select-btn action-btn';
        selectBtn.title = locale.selectMessages;
        selectBtn.innerHTML = SELECT_ICON_SVG;
        selectBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            deps.enterMultiSelectMode(group);
        });
        actions.appendChild(selectBtn);

        inner.appendChild(actions);
    }

    function addMessage(role, text, options) {
        const locale = deps.getLocale();
        const restoring = options && options.restore;
        deps.placeholder.style.display = 'none';

        const streamingMessageId = deps.getStreamingMessageId();
        if (!restoring && role === 'assistant' && streamingMessageId) {
            const last = document.getElementById(streamingMessageId);
            if (last) {
                last.querySelector('.content').textContent = text;
                last._rawText = text;
                if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
                deps.maybeScrollToBottom();
                return;
            }
        }

        const id = 'msg-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
        const group = document.createElement('div');
        group.className = 'message-group ' + role;
        group.id = id;
        if (deps.isSelectableRole(role)) {
            group.classList.add('selectable');
            const selectWrap = document.createElement('label');
            selectWrap.className = 'msg-select-wrap';
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.addEventListener('click', function(e) {
                e.stopPropagation();
            });
            checkbox.addEventListener('change', function() {
                deps.setGroupSelected(group, checkbox.checked);
            });
            selectWrap.appendChild(checkbox);
            group.appendChild(selectWrap);
            deps.wireSelectableGroup(group);
        }
        deps.assignSessionIndex(group);

        const inner = document.createElement('div');
        inner.className = 'message-group-inner';

        let div;
        let auxParts = null;
        if (role === 'tool' || role === 'thought') {
            auxParts = deps.buildAuxiliaryMessage(role, text);
            div = auxParts.div;
            if (!restoring) {
                div.classList.add('is-live');
            }
        } else {
            div = document.createElement('div');
            div.className = 'message ' + role;
            const label = document.createElement('div');
            label.className = 'label';
            label.textContent = role === 'user' ? locale.roleYou : locale.roleHermes;
            div.appendChild(label);
            const content = document.createElement('div');
            content.className = 'content';
            content.textContent = text;
            div.appendChild(content);
            group._rawText = text;
            if (role === 'user') {
                deps.processFileRefs(content);
            }
        }

        if (role === 'assistant' && !restoring) {
            deps.resetToolAggregation();
            div.classList.add('streaming');
            deps.setStreamingMessageId(id);
            deps.clearAllToolLive();
            deps.enableStopAfterAgentOutput();
        }
        if (role === 'assistant') {
            group._rawText = text;
        }

        inner.appendChild(div);
        if (auxParts) {
            deps.wireAuxiliaryMessage(group, auxParts, !!(restoring && options && options.deferMarkdown));
        }
        if (!restoring && role === 'thought') {
            deps.resetToolAggregation();
        }
        if (!restoring && (role === 'thought' || role === 'tool')) {
            deps.enableStopAfterAgentOutput();
        }
        attachMessageActions(group, inner);
        group.appendChild(inner);
        messagesEl.appendChild(group);
        if (role === 'thought' && !window._showThoughts) group.style.display = 'none';
        if (role === 'tool' && !window._showToolCalls) group.style.display = 'none';
        deps.updateQuickActionBtns();
        if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
        deps.maybeScrollToBottom();
        return id;
    }

    function finalizeAssistantBubble() {
        const thoughtMsgId = deps.getThoughtMsgId();
        if (thoughtMsgId) {
            const thoughtGroup = document.getElementById(thoughtMsgId);
            deps.setAuxMessageLive(thoughtGroup, false);
            deps.finalizeAuxiliaryBubble(thoughtGroup);
            deps.setThoughtMsgId(null);
        }
        deps.clearAllToolLive();
        const streamingMessageId = deps.getStreamingMessageId();
        if (streamingMessageId) {
            const group = document.getElementById(streamingMessageId);
            const el = group ? group.querySelector('.message') : null;
            if (el) {
                el.classList.remove('streaming');
                const text = el.querySelector('.content').textContent;
                if (group) group._rawText = text;
                el.querySelector('.content').innerHTML = renderMarkdown(text);
                deps.setupContentBlocks(el.querySelector('.content'));
                deps.processFileRefs(el.querySelector('.content'));
            }
            deps.setStreamingMessageId(null);
        }
        if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
    }

    function enableStopAfterAgentOutput() {
        if (!deps.getAwaitingFirstChunk()) {
            return;
        }
        deps.setAwaitingFirstChunk(false);
        if (deps.getIsPrompting()) {
            deps.setInputMode('stop');
        }
    }

    function finishStreaming() {
        finalizeAssistantBubble();
        if (deps.getIsPrompting() && deps.getAwaitingFirstChunk()) {
            deps.setInputMode('waiting');
        } else {
            deps.setInputMode(deps.getIsPrompting() ? 'stop' : (deps.getCanSend() ? 'send' : 'disabled'));
        }
    }

    return {
        getMessagePlainText,
        addMessage,
        finalizeAssistantBubble,
        enableStopAfterAgentOutput,
        finishStreaming,
    };
}
