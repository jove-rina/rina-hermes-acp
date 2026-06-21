import { describe, it } from 'mocha';
import assert from 'assert';
import {
    canAggregateToolTexts,
    countNonemptyLines,
    isShortToolText,
    mergeToolTexts,
    rebuildAggregatedToolText,
} from '../../chat/toolAggregate';

describe('toolAggregate', () => {
    it('counts non-empty lines', () => {
        assert.strictEqual(countNonemptyLines('⚙️ Read\n\npath: a'), 2);
        assert.strictEqual(countNonemptyLines(''), 0);
    });

    it('treats up to three lines as short', () => {
        assert.ok(isShortToolText('a\nb\nc'));
        assert.ok(!isShortToolText('a\nb\nc\nd'));
    });

    it('merges two short consecutive tools', () => {
        const a = '🔧 Tool A';
        const b = '🔧 Tool B';
        assert.ok(canAggregateToolTexts(a, b));
        assert.ok(mergeToolTexts(a, b).includes('---'));
    });

    it('does not merge when incoming is long', () => {
        const incoming = 'line1\nline2\nline3\nline4';
        assert.ok(!canAggregateToolTexts('🔧 Short', incoming));
    });

    it('does not merge when combined exceeds max lines', () => {
        const existing = Array.from({ length: 10 }, (_, i) => `line${i + 1}`).join('\n');
        assert.ok(!canAggregateToolTexts(existing, '🔧 x\ny'));
    });

    it('rebuilds aggregated entries', () => {
        const text = rebuildAggregatedToolText([
            { text: '🔧 A' },
            { text: '🔧 B' },
        ]);
        assert.ok(text.includes('---'));
        assert.ok(text.includes('🔧 A'));
        assert.ok(text.includes('🔧 B'));
    });
});
