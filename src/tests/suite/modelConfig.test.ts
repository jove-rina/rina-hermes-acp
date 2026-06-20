import { describe, it } from 'mocha';
import assert from 'assert';
import {
    buildFallbackModelListState,
    buildModelListState,
    flattenSelectOptions,
    findModelConfigOption,
} from '../../acp/modelConfig';

describe('modelConfig', () => {
    it('flattenSelectOptions handles flat and grouped options', () => {
        const flat = flattenSelectOptions([
            { value: 'a', name: 'Model A' },
            { value: 'b', name: 'Model B' },
        ]);
        assert.strictEqual(flat.length, 2);
        assert.strictEqual(flat[0].valueId, 'a');

        const grouped = flattenSelectOptions([
            {
                group: 'g1',
                name: 'Group',
                options: [{ value: 'x', name: 'X' }],
            },
        ]);
        assert.strictEqual(grouped.length, 1);
        assert.strictEqual(grouped[0].name, 'X');
    });

    it('findModelConfigOption prefers category model', () => {
        const opts = [
            { id: 'mode', type: 'select', name: 'Mode', options: [] },
            { id: 'model', type: 'select', category: 'model', name: 'Model', options: [] },
        ];
        const found = findModelConfigOption(opts);
        assert.strictEqual(found?.id, 'model');
    });

    it('buildModelListState returns current label', () => {
        const state = buildModelListState([
            {
                id: 'model',
                type: 'select',
                category: 'model',
                name: 'Model',
                currentValue: 'gpt-4',
                options: [
                    { value: 'gpt-4', name: 'GPT-4' },
                    { value: 'gpt-3.5', name: 'GPT-3.5' },
                ],
            },
        ]);
        assert.ok(state);
        assert.strictEqual(state!.currentLabel, 'GPT-4');
        assert.strictEqual(state!.models.length, 2);
        assert.strictEqual(state!.fromAgent, true);
    });

    it('buildFallbackModelListState uses settings list', () => {
        const state = buildFallbackModelListState(
            [
                { id: 'fast', name: 'Fast' },
                { id: 'smart', name: 'Smart' },
            ],
            'smart'
        );
        assert.ok(state);
        assert.strictEqual(state!.fromAgent, false);
        assert.strictEqual(state!.currentLabel, 'Smart');
        assert.strictEqual(state!.configId, '__settings__');
    });
});
