/**
 * Helpers for ACP session configuration options (model selector).
 */

export interface ModelListItem {
    valueId: string;
    name: string;
}

export interface ModelListState {
    /** ACP config option id (session/set_config_option) */
    configId: string;
    currentValueId: string;
    currentLabel: string;
    models: ModelListItem[];
    /** true when options come from agent configOptions; false for settings fallback */
    fromAgent: boolean;
}

export interface FallbackModel {
    id: string;
    name: string;
}

/** Flatten select options (supports grouped options). */
export function flattenSelectOptions(options: unknown): ModelListItem[] {
    if (!Array.isArray(options)) {
        return [];
    }
    const result: ModelListItem[] = [];
    for (const item of options) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const o = item as Record<string, unknown>;
        if (typeof o.value === 'string' && typeof o.name === 'string') {
            result.push({ valueId: o.value, name: o.name });
            continue;
        }
        if (Array.isArray(o.options)) {
            for (const nested of o.options) {
                if (
                    nested &&
                    typeof nested === 'object' &&
                    typeof (nested as Record<string, unknown>).value === 'string' &&
                    typeof (nested as Record<string, unknown>).name === 'string'
                ) {
                    const n = nested as Record<string, string>;
                    result.push({ valueId: n.value, name: n.name });
                }
            }
        }
    }
    return result;
}

/** Pick the best config option to use as the model selector. */
export function findModelConfigOption(configOptions: unknown): Record<string, unknown> | null {
    if (!Array.isArray(configOptions) || configOptions.length === 0) {
        return null;
    }
    const opts = configOptions.filter(
        (o): o is Record<string, unknown> => !!o && typeof o === 'object' && (o as Record<string, unknown>).type === 'select'
    );
    if (opts.length === 0) {
        return null;
    }
    const byCategory = opts.find(o => o.category === 'model');
    if (byCategory) {
        return byCategory;
    }
    const byName = opts.find(o => /model/i.test(String(o.name ?? o.id ?? '')));
    if (byName) {
        return byName;
    }
    return opts[0];
}

export function buildModelListState(configOptions: unknown): ModelListState | null {
    const option = findModelConfigOption(configOptions);
    if (!option) {
        return null;
    }
    const models = flattenSelectOptions(option.options);
    if (models.length === 0) {
        return null;
    }
    const configId = String(option.id ?? '');
    const currentValueId = String(option.currentValue ?? '');
    const currentLabel =
        models.find(m => m.valueId === currentValueId)?.name ||
        currentValueId ||
        models[0].name;

    return {
        configId,
        currentValueId,
        currentLabel,
        models,
        fromAgent: true,
    };
}

export function buildFallbackModelListState(
    models: FallbackModel[],
    currentValueId: string
): ModelListState | null {
    if (!models.length) {
        return null;
    }
    const currentValue =
        currentValueId && models.some(m => m.id === currentValueId)
            ? currentValueId
            : models[0].id;
    const currentLabel = models.find(m => m.id === currentValue)?.name ?? currentValue;

    return {
        configId: '__settings__',
        currentValueId: currentValue,
        currentLabel,
        models: models.map(m => ({ valueId: m.id, name: m.name })),
        fromAgent: false,
    };
}
