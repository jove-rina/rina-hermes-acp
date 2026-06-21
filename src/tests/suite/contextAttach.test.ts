import { describe, it } from 'mocha';
import assert from 'assert';
import {
    buildContextAttachPrefix,
    composePromptWithContext,
    filterAttachableMessages,
    MAX_CONTEXT_ATTACH_CHARS,
    resolveAttachMessages,
    resolveCustomAttachMessages,
    truncateAttachMessages,
} from '../../chat/contextAttach';
import { en } from '../../i18n/locales/en';

describe('contextAttach', () => {
    const messages = [
        { role: 'user', text: 'Hello' },
        { role: 'assistant', text: 'Hi there' },
        { role: 'thought', text: 'thinking...' },
        { role: 'tool', text: 'tool output' },
        { role: 'permission', text: 'Allow run?' },
        { role: 'user', text: 'Follow up' },
        { role: 'assistant', text: 'Sure' },
    ];

    it('filterAttachableMessages keeps user, assistant, permission only', () => {
        const filtered = filterAttachableMessages(messages);
        assert.strictEqual(filtered.length, 5);
        assert.ok(filtered.every(m => m.role === 'user' || m.role === 'assistant' || m.role === 'permission'));
    });

    it('resolveAttachMessages returns last N memory messages', () => {
        const filtered = filterAttachableMessages(messages);
        assert.strictEqual(resolveAttachMessages(filtered, { mode: 'last2' }).length, 2);
        assert.strictEqual(resolveAttachMessages(filtered, { mode: 'last2' })[0].text, 'Follow up');
    });

    it('resolveCustomAttachMessages keeps memory roles only and preserves order', () => {
        const picked = resolveCustomAttachMessages(messages, [2, 4, 0, 4, 99, -1]);
        assert.deepStrictEqual(picked.map(m => m.role), ['permission', 'user']);
        assert.strictEqual(picked[0].text, 'Allow run?');
        assert.strictEqual(picked[1].text, 'Hello');
    });

    it('resolveAttachMessages truncates all mode to char budget', () => {
        const longMessages = Array.from({ length: 50 }, (_, i) => ({
            role: 'user',
            text: `msg-${i}-` + 'x'.repeat(900),
        }));
        const filtered = filterAttachableMessages(longMessages);
        const picked = resolveAttachMessages(filtered, { mode: 'all' });
        const totalChars = picked.reduce((sum, m) => sum + m.text.length, 0);
        assert.ok(totalChars <= MAX_CONTEXT_ATTACH_CHARS);
        assert.ok(picked.length < filtered.length);
        assert.strictEqual(picked[picked.length - 1].text, longMessages[49].text);
    });

    it('truncateAttachMessages keeps most recent messages', () => {
        const items = [
            { role: 'user', text: 'a'.repeat(100) },
            { role: 'assistant', text: 'b'.repeat(100) },
            { role: 'user', text: 'c'.repeat(100) },
        ];
        const picked = truncateAttachMessages(items, 250);
        assert.strictEqual(picked.length, 2);
        assert.strictEqual(picked[0].text, items[1].text);
        assert.strictEqual(picked[1].text, items[2].text);
    });

    it('composePromptWithContext prefixes user text', () => {
        const filtered = filterAttachableMessages(messages);
        const prompt = composePromptWithContext('New question', filtered.slice(0, 2), en);
        assert.ok(prompt.includes(en.contextAttachPrefixHeader));
        assert.ok(prompt.includes('Hello'));
        assert.ok(prompt.endsWith('New question'));
    });

    it('buildContextAttachPrefix labels permission cards', () => {
        const prefix = buildContextAttachPrefix(
            [{ role: 'permission', text: 'Allow run?' }],
            en
        );
        assert.ok(prefix.includes(en.permissionTitle));
        assert.ok(prefix.includes('Allow run?'));
    });

    it('buildContextAttachPrefix labels thought and tool messages', () => {
        const prefix = buildContextAttachPrefix(
            [
                { role: 'thought', text: 'thinking...' },
                { role: 'tool', text: 'tool output' },
            ],
            en
        );
        assert.ok(prefix.includes(en.roleThought));
        assert.ok(prefix.includes(en.roleTool));
        assert.ok(prefix.includes('thinking...'));
    });

    it('buildContextAttachPrefix returns empty for no messages', () => {
        assert.strictEqual(buildContextAttachPrefix([], en), '');
    });
});
