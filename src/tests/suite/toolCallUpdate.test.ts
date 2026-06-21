import { describe, it } from 'mocha';
import assert from 'assert';
import {
    ToolCallTracker,
    extractToolCallBody,
    formatToolCallDisplay,
    formatToolCallSummary,
    normalizeToolCallStatus,
    parseToolCallSessionUpdate,
} from '../../acp/toolCallUpdate';

describe('toolCallUpdate', () => {
    it('parseToolCallSessionUpdate defaults tool_call to pending', () => {
        const view = parseToolCallSessionUpdate({
            toolCallId: 'tc-1',
            title: 'Run npm install',
        }, 'tool_call');
        assert.ok(view);
        assert.strictEqual(view!.status, 'pending');
        assert.strictEqual(view!.title, 'Run npm install');
    });

    it('parseToolCallSessionUpdate defaults tool_call_update to in_progress', () => {
        const view = parseToolCallSessionUpdate({
            toolCallId: 'tc-1',
            title: 'Run npm install',
        }, 'tool_call_update');
        assert.ok(view);
        assert.strictEqual(view!.status, 'in_progress');
    });

    it('parseToolCallSessionUpdate reads explicit status and body', () => {
        const view = parseToolCallSessionUpdate({
            toolCallId: 'tc-2',
            title: 'Read file',
            status: 'completed',
            content: [{ type: 'text', text: 'done' }],
        }, 'tool_call_update');
        assert.ok(view);
        assert.strictEqual(view!.status, 'completed');
        assert.strictEqual(view!.body, 'done');
    });

    it('formatToolCallSummary adds status icon', () => {
        assert.strictEqual(formatToolCallSummary('failed', 'Deploy'), '❌ Deploy');
    });

    it('extractToolCallBody stringifies rawOutput objects', () => {
        const body = extractToolCallBody({ rawOutput: { exitCode: 1 } });
        assert.ok(body?.includes('exitCode'));
    });

    it('extractToolCallBody includes rawInput and content', () => {
        const body = extractToolCallBody({
            content: [{ type: 'text', text: 'running' }],
            rawInput: { path: '/tmp/a.ts' },
        });
        assert.ok(body?.includes('running'));
        assert.ok(body?.includes('path'));
    });

    it('formatToolCallDisplay includes body when present', () => {
        const text = formatToolCallDisplay({
            toolCallId: 'tc-1',
            status: 'in_progress',
            title: 'Read file',
            body: 'path: README.md',
        });
        assert.strictEqual(text, '⚙️ Read file\n\npath: README.md');
    });

    it('formatToolCallDisplay uses title only when no body', () => {
        const text = formatToolCallDisplay({
            toolCallId: 'tc-1',
            status: 'pending',
            title: 'Tool running',
        });
        assert.strictEqual(text, '🔧 Tool running');
    });
});

describe('ToolCallTracker', () => {
    it('merges updates for the same toolCallId', () => {
        const tracker = new ToolCallTracker();
        const first = tracker.apply({
            toolCallId: 'tc-1',
            status: 'pending',
            title: 'Terminal',
        });
        assert.strictEqual(first.status, 'pending');

        const second = tracker.apply({
            toolCallId: 'tc-1',
            status: 'in_progress',
            title: 'Terminal',
        });
        assert.strictEqual(second.status, 'in_progress');
        assert.strictEqual(tracker.activeCount, 1);
    });

    it('removes terminal statuses from active set', () => {
        const tracker = new ToolCallTracker();
        tracker.apply({ toolCallId: 'tc-1', status: 'pending', title: 'A' });
        tracker.apply({ toolCallId: 'tc-1', status: 'completed', title: 'A', body: 'ok' });
        assert.strictEqual(tracker.activeCount, 0);
    });

    it('cancelActive marks pending and in_progress as cancelled', () => {
        const tracker = new ToolCallTracker();
        tracker.apply({ toolCallId: 'tc-1', status: 'pending', title: 'A' });
        tracker.apply({ toolCallId: 'tc-2', status: 'in_progress', title: 'B' });
        tracker.apply({ toolCallId: 'tc-3', status: 'completed', title: 'C' });

        const cancelled = tracker.cancelActive();
        assert.strictEqual(cancelled.length, 2);
        assert.ok(cancelled.every(c => c.status === 'cancelled'));
        assert.strictEqual(tracker.activeCount, 0);
    });
});
