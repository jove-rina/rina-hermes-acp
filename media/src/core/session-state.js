import { inputEl } from './dom-refs.js';
import {
    configureScrollStreaming,
    bindMessagesScrollListener,
} from '../messages/scroll.js';

export function createSessionState() {
    let lastSessions = [];
    let lastActiveSessionId = '';
    let sessionMsgCounter = 0;
    let multiSelectMode = false;
    let multiSelectPurpose = 'normal';
    let activeSessionId = '';
    let streamingMessageId = null;
    let thoughtMsgId = null;
    let canSend = false;
    let isPrompting = false;
    let awaitingFirstChunk = false;

    window._showThoughts = true;
    window._showToolCalls = true;

    function isActivelyStreaming() {
        return !!(streamingMessageId || isPrompting);
    }

    function initScrollBehavior() {
        configureScrollStreaming(isActivelyStreaming);
        bindMessagesScrollListener();
    }

    function isMessageForActiveSession(msg) {
        return !msg.sessionId || msg.sessionId === lastActiveSessionId;
    }

    function maybeFocusInputAfterResponse() {
        if (!canSend || inputEl.disabled) {
            return;
        }
        if (!document.hasFocus()) {
            return;
        }
        requestAnimationFrame(function() {
            if (canSend && !inputEl.disabled && document.hasFocus()) {
                inputEl.focus();
            }
        });
    }

    function resetStreamingState() {
        streamingMessageId = null;
        thoughtMsgId = null;
    }

    return {
        getLastSessions: () => lastSessions,
        setLastSessions: (v) => { lastSessions = v; },
        getLastActiveSessionId: () => lastActiveSessionId,
        setLastActiveSessionId: (v) => { lastActiveSessionId = v; },
        getSessionMsgCounter: () => sessionMsgCounter,
        bumpSessionIndex: () => sessionMsgCounter++,
        resetSessionIndex: () => { sessionMsgCounter = 0; },
        getMultiSelectMode: () => multiSelectMode,
        setMultiSelectMode: (v) => { multiSelectMode = v; },
        getMultiSelectPurpose: () => multiSelectPurpose,
        setMultiSelectPurpose: (v) => { multiSelectPurpose = v; },
        getActiveSessionId: () => activeSessionId,
        setActiveSessionId: (v) => { activeSessionId = v; },
        getStreamingMessageId: () => streamingMessageId,
        setStreamingMessageId: (v) => { streamingMessageId = v; },
        getThoughtMsgId: () => thoughtMsgId,
        setThoughtMsgId: (v) => { thoughtMsgId = v; },
        getCanSend: () => canSend,
        setCanSend: (v) => { canSend = v; },
        getIsPrompting: () => isPrompting,
        setIsPrompting: (v) => { isPrompting = v; },
        getAwaitingFirstChunk: () => awaitingFirstChunk,
        setAwaitingFirstChunk: (v) => { awaitingFirstChunk = v; },
        initScrollBehavior,
        isMessageForActiveSession,
        maybeFocusInputAfterResponse,
        resetStreamingState,
    };
}
