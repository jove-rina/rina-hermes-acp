import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initMessageBridge } from '../bridge/message-bridge.js';

describe('initMessageBridge', () => {
    /** @type {Array<(event: { data: unknown }) => void>} */
    let messageListeners;
    /** @type {Window} */
    let originalWindow;

    beforeEach(() => {
        messageListeners = [];
        originalWindow = globalThis.window;
        globalThis.window = {
            addEventListener(type, listener) {
                if (type === 'message') {
                    messageListeners.push(listener);
                }
            },
        };
    });

    afterEach(() => {
        globalThis.window = originalWindow;
    });

    it('registers a message listener', () => {
        initMessageBridge({});
        expect(messageListeners).toHaveLength(1);
    });

    it('dispatches to handler by msg.type', () => {
        const status = vi.fn();
        initMessageBridge({ status });
        messageListeners[0]({ data: { type: 'status', status: 'ready' } });
        expect(status).toHaveBeenCalledWith({ type: 'status', status: 'ready' });
    });

    it('ignores unknown message types', () => {
        const status = vi.fn();
        initMessageBridge({ status });
        expect(() => {
            messageListeners[0]({ data: { type: 'unknown-type' } });
        }).not.toThrow();
        expect(status).not.toHaveBeenCalled();
    });
});
