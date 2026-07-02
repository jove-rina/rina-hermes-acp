import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../core/dom-refs.js', () => ({
    inputEl: { disabled: false },
}));

vi.mock('../messages/scroll.js', () => ({
    configureScrollStreaming: vi.fn(),
    bindMessagesScrollListener: vi.fn(),
}));

/** @type {Window} */
const originalWindow = globalThis.window;

import { createSessionState } from '../core/session-state.js';

beforeEach(() => {
    globalThis.window = { _showThoughts: true, _showToolCalls: true };
});

afterEach(() => {
    globalThis.window = originalWindow;
});

describe('createSessionState', () => {
    let session;

    beforeEach(() => {
        session = createSessionState();
    });

    it('tracks session list and active id', () => {
        session.setLastSessions([{ id: 'a' }]);
        session.setLastActiveSessionId('sess-1');
        expect(session.getLastSessions()).toEqual([{ id: 'a' }]);
        expect(session.getLastActiveSessionId()).toBe('sess-1');
    });

    it('bumps and resets session message index', () => {
        expect(session.bumpSessionIndex()).toBe(0);
        expect(session.bumpSessionIndex()).toBe(1);
        session.resetSessionIndex();
        expect(session.bumpSessionIndex()).toBe(0);
    });

    it('isMessageForActiveSession matches blank or active session id', () => {
        session.setLastActiveSessionId('active');
        expect(session.isMessageForActiveSession({})).toBe(true);
        expect(session.isMessageForActiveSession({ sessionId: 'active' })).toBe(true);
        expect(session.isMessageForActiveSession({ sessionId: 'other' })).toBe(false);
    });

    it('resetStreamingState clears streaming ids', () => {
        session.setStreamingMessageId('stream-1');
        session.setThoughtMsgId('thought-1');
        session.resetStreamingState();
        expect(session.getStreamingMessageId()).toBeNull();
        expect(session.getThoughtMsgId()).toBeNull();
    });

    it('isActivelyStreaming when streaming or prompting', () => {
        expect(session.getStreamingMessageId()).toBeNull();
        expect(session.getIsPrompting()).toBe(false);

        session.setStreamingMessageId('s1');
        expect(session.getStreamingMessageId()).toBe('s1');

        session.resetStreamingState();
        session.setIsPrompting(true);
        expect(session.getIsPrompting()).toBe(true);
    });
});
