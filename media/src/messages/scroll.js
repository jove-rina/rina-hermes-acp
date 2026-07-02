import { messagesEl } from '../core/dom-refs.js';

export const SCROLL_BOTTOM_THRESHOLD = 24;
export const SCROLL_IDLE_MS = 5000;
export let scrollPinnedByUser = false;
export let scrollIdleTimer = null;

/** @type {() => boolean} */
let isActivelyStreamingFn = () => false;

export function configureScrollStreaming(isActivelyStreaming) {
    isActivelyStreamingFn = isActivelyStreaming;
}

export function isMessagesAtBottom() {
    if (!messagesEl) {
        return true;
    }
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
}

export function maybeScrollToBottom(force) {
    if (!messagesEl) {
        return;
    }
    if (force || !scrollPinnedByUser) {
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }
}

export function scheduleScrollReenable() {
    if (scrollIdleTimer) {
        clearTimeout(scrollIdleTimer);
    }
    scrollIdleTimer = setTimeout(function() {
        scrollIdleTimer = null;
        if (isActivelyStreamingFn()) {
            scrollPinnedByUser = false;
            maybeScrollToBottom(true);
        }
    }, SCROLL_IDLE_MS);
}

export function onMessagesScroll() {
    if (!isActivelyStreamingFn()) {
        return;
    }
    if (!isMessagesAtBottom()) {
        scrollPinnedByUser = true;
    }
    scheduleScrollReenable();
}

export function resetAutoScrollFollow() {
    scrollPinnedByUser = false;
    if (scrollIdleTimer) {
        clearTimeout(scrollIdleTimer);
        scrollIdleTimer = null;
    }
}

export function bindMessagesScrollListener() {
    if (messagesEl) {
        messagesEl.addEventListener('scroll', onMessagesScroll, { passive: true });
    }
}

