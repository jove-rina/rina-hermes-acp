import {
    messagesEl,
    chatBodyEl,
    SESSION_RENDER_BANNER_ID,
    LOCAL_HISTORY_DIVIDER_ID,
    MARKDOWN_RENDER_BATCH_SIZE,
} from '../core/dom-refs.js';
import { renderMarkdown } from './markdown.js';

/** @param {Record<string, Function>} deps */
export function createSessionRender(deps) {
    let sessionRenderJobId = 0;

    function showSessionRenderBanner() {
        if (!chatBodyEl) return;
        const locale = deps.getLocale();
        let banner = document.getElementById(SESSION_RENDER_BANNER_ID);
        if (!banner) {
            banner = document.createElement('div');
            banner.id = SESSION_RENDER_BANNER_ID;
            banner.className = 'session-render-banner';
            banner.setAttribute('role', 'status');
            banner.setAttribute('aria-live', 'polite');
            banner.innerHTML = '<span class="session-render-spinner" aria-hidden="true"></span><span class="session-render-text"></span>';
            chatBodyEl.appendChild(banner);
        }
        banner.classList.remove('is-hiding');
        const textEl = banner.querySelector('.session-render-text');
        if (textEl) textEl.textContent = locale.sessionRendering || '';
        banner.hidden = false;
    }

    function forceHideSessionRenderBanner() {
        const banner = document.getElementById(SESSION_RENDER_BANNER_ID);
        if (!banner) return;
        banner.classList.remove('is-hiding');
        banner.hidden = true;
    }

    function hideSessionRenderBanner() {
        const banner = document.getElementById(SESSION_RENDER_BANNER_ID);
        if (!banner || banner.hidden || banner.classList.contains('is-hiding')) return;
        banner.classList.add('is-hiding');
        const onExitEnd = function(e) {
            if (e.target !== banner || e.animationName !== 'session-render-exit') return;
            banner.removeEventListener('animationend', onExitEnd);
            banner.hidden = true;
            banner.classList.remove('is-hiding');
        };
        banner.addEventListener('animationend', onExitEnd);
    }

    function cancelSessionMarkdownRender() {
        sessionRenderJobId++;
        forceHideSessionRenderBanner();
    }

    function collectMarkdownRenderTargets() {
        const targets = [];
        messagesEl.querySelectorAll('.message-group').forEach(function(group) {
            if (group.id === LOCAL_HISTORY_DIVIDER_ID) return;
            const assistantContent = group.querySelector('.message.assistant .content');
            if (assistantContent) {
                const text = group._rawText || assistantContent.textContent || '';
                if (text.trim()) {
                    targets.push({ kind: 'assistant', el: assistantContent, text: text, group: group });
                }
            }
            if (group._auxState && group._auxState.contentEl) {
                const text = group._auxState.rawText || group._auxState.contentEl.textContent || '';
                if (text.trim()) {
                    targets.push({ kind: 'aux', group: group, text: text });
                }
            }
        });
        return targets;
    }

    function renderMarkdownTarget(target) {
        if (target.kind === 'assistant') {
            target.group._rawText = target.text;
            target.el.innerHTML = renderMarkdown(target.text);
            deps.setupContentBlocks(target.el);
            deps.processFileRefs(target.el);
            return;
        }
        if (target.kind === 'aux') {
            deps.setAuxiliaryContent(target.group, target.text);
        }
    }

    function scheduleSessionMarkdownRender() {
        const jobId = ++sessionRenderJobId;
        const targets = collectMarkdownRenderTargets();
        if (!targets.length) {
            hideSessionRenderBanner();
            window._hermesRendered = true;
            if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
            return;
        }
        showSessionRenderBanner();
        let index = 0;
        function runBatch() {
            if (jobId !== sessionRenderJobId) return;
            const end = Math.min(index + MARKDOWN_RENDER_BATCH_SIZE, targets.length);
            for (; index < end; index++) {
                renderMarkdownTarget(targets[index]);
            }
            if (index < targets.length) {
                requestAnimationFrame(runBatch);
            } else {
                hideSessionRenderBanner();
                window._hermesRendered = true;
                if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
            }
        }
        requestAnimationFrame(runBatch);
    }

    return {
        cancelSessionMarkdownRender,
        scheduleSessionMarkdownRender,
    };
}
