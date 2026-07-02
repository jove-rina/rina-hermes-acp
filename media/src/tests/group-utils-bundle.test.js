import { describe, it, expect, vi } from 'vitest';

vi.mock('../core/vscode.js', () => ({ vscode: { postMessage: vi.fn() } }));
vi.mock('../core/dom-refs.js', () => ({ messagesEl: { querySelectorAll: vi.fn(() => []) } }));

import { createGroupUtilsBundle } from '../app/bootstrap/create-group-utils-bundle.js';

describe('createGroupUtilsBundle', () => {
    it('delegates getMessagePlainText to bound messages ref', () => {
        const session = {
            getLastActiveSessionId: () => 'sess-a',
            bumpSessionIndex: vi.fn(() => 0),
            resetSessionIndex: vi.fn(),
        };
        const bundle = createGroupUtilsBundle({
            getLocale: () => ({ roleYou: 'You' }),
            session,
        });

        bundle.bindMessagesRef({
            getMessagePlainText: (group) => group.dataset.text || '',
        });

        const group = { dataset: { text: 'hello' }, classList: { contains: () => false } };
        expect(bundle.groupUtils.getGroupsPlainText([group])).toContain('hello');
    });

    it('exports session index helpers from groupUtils', () => {
        const session = {
            getLastActiveSessionId: () => '',
            bumpSessionIndex: vi.fn(() => 7),
            resetSessionIndex: vi.fn(),
        };
        const bundle = createGroupUtilsBundle({
            getLocale: () => ({}),
            session,
        });
        bundle.bindMessagesRef({ getMessagePlainText: () => '' });

        expect(bundle.assignSessionIndex).toBeTypeOf('function');
        expect(bundle.reindexSessionIndices).toBeTypeOf('function');
        expect(bundle.requestSessionExport).toBeTypeOf('function');
    });
});
