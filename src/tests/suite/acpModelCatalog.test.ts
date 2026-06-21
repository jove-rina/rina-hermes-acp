import { describe, it } from 'mocha';
import assert from 'assert';
import {
    buildCatalogFromHermesModelsRaw,
    buildCatalogFromModelOptions,
    parseProviderFromDescription,
    resolveModelCatalog,
} from '../../acp/acpModelCatalog';

describe('acpModelCatalog', () => {
    it('buildCatalogFromModelOptions maps provider rows to grouped catalog', () => {
        const catalog = buildCatalogFromModelOptions({
            model: 'deepseek-v4-flash',
            provider: 'custom:deepseek',
            providers: [
                {
                    slug: 'custom:deepseek',
                    name: 'DeepSeek',
                    is_current: true,
                    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
                },
                {
                    slug: 'custom:agnes',
                    name: 'Agnes',
                    models: ['agnes-2.0-flash', 'agnes-2.0-pro'],
                },
            ],
        });

        assert.strictEqual(catalog.groups.length, 2);
        assert.strictEqual(catalog.profileDefault?.modelName, 'deepseek-v4-flash');
        assert.strictEqual(catalog.profileDefault?.valueId, 'custom:deepseek-v4-flash');
        assert.strictEqual(catalog.groups[0].name, 'DeepSeek');
        assert.strictEqual(catalog.groups[0].models.length, 2);
    });

    it('buildCatalogFromHermesModelsRaw groups by Provider description', () => {
        const catalog = buildCatalogFromHermesModelsRaw({
            currentModelId: 'custom:deepseek-v4-flash',
            availableModels: [
                {
                    modelId: 'custom:deepseek-v4-flash',
                    name: 'deepseek-v4-flash',
                    description: 'Provider: DeepSeek • current',
                },
                {
                    modelId: 'custom:deepseek-v4-pro',
                    name: 'deepseek-v4-pro',
                    description: 'Provider: DeepSeek',
                },
                {
                    modelId: 'custom:agnes-2.0-flash',
                    name: 'agnes-2.0-flash',
                    description: 'Provider: Agnes',
                },
            ],
        });

        assert.ok(catalog);
        assert.strictEqual(catalog!.groups.length, 2);
        assert.strictEqual(catalog!.groups[0].name, 'DeepSeek');
        assert.strictEqual(catalog!.groups[0].models.length, 2);
        assert.strictEqual(catalog!.profileDefault?.valueId, 'custom:deepseek-v4-flash');
    });

    it('parseProviderFromDescription extracts provider label', () => {
        assert.strictEqual(parseProviderFromDescription('Provider: DeepSeek • current'), 'DeepSeek');
        assert.strictEqual(parseProviderFromDescription('Provider: Custom endpoint'), 'Custom endpoint');
    });

    it('resolveModelCatalog prefers model.options over session models', () => {
        const fromOptions = resolveModelCatalog(
            {
                model: 'deepseek-v4-flash',
                provider: 'custom:deepseek',
                providers: [{
                    slug: 'custom:deepseek',
                    name: 'DeepSeek',
                    is_current: true,
                    models: ['deepseek-v4-flash'],
                }],
            },
            {
                currentModelId: 'other:model',
                availableModels: [{ modelId: 'other:model', name: 'Other' }],
            }
        );
        assert.ok(fromOptions);
        assert.strictEqual(fromOptions!.profileDefault?.modelName, 'deepseek-v4-flash');

        const fromSession = resolveModelCatalog(null, {
            currentModelId: 'custom:deepseek-v4-flash',
            availableModels: [{
                modelId: 'custom:deepseek-v4-flash',
                name: 'deepseek-v4-flash',
                description: 'Provider: DeepSeek',
            }],
        });
        assert.ok(fromSession);
        assert.strictEqual(fromSession!.groups[0].name, 'DeepSeek');
    });
});
