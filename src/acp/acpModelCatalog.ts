import {
    type ModelListItem,
    type ModelProviderGroup,
    type ProfileDefaultModel,
    type ProfileModelCatalog,
    encodeHermesModelValueId,
} from './modelConfig';

export interface AcpModelOptionsProvider {
    slug: string;
    name: string;
    models?: string[];
    is_current?: boolean;
}

export interface AcpModelOptionsResponse {
    model?: string;
    provider?: string;
    providers?: AcpModelOptionsProvider[];
}

/** Build grouped catalog from Hermes ACP ``model.options`` (same shape as TUI gateway). */
export function buildCatalogFromModelOptions(payload: AcpModelOptionsResponse): ProfileModelCatalog {
    const groups: ModelProviderGroup[] = [];

    for (const row of payload.providers ?? []) {
        const modelNames = (row.models ?? []).map(m => m.trim()).filter(Boolean);
        if (!modelNames.length) {
            continue;
        }
        const slug = (row.slug || 'custom').trim();
        groups.push({
            slug,
            name: (row.name || slug).trim(),
            isPrimary: Boolean(row.is_current),
            models: modelNames.map(name => ({
                valueId: encodeHermesModelValueId(slug, name),
                name,
            })),
        });
    }

    groups.sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) {
            return a.isPrimary ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    const profileDefault = resolveProfileDefaultFromOptions(payload, groups);

    return {
        groups,
        flatModels: flattenGroupModels(groups),
        profileDefault,
    };
}

/** Group Hermes native ACP ``models.availableModels`` by ``description`` provider label. */
export function buildCatalogFromHermesModelsRaw(raw: unknown): ProfileModelCatalog | null {
    if (!raw || typeof raw !== 'object') {
        return null;
    }
    const o = raw as Record<string, unknown>;
    const available = o.availableModels ?? o.available_models;
    if (!Array.isArray(available) || available.length === 0) {
        return null;
    }

    const groupMap = new Map<string, ModelProviderGroup>();
    const currentModelId = String(o.currentModelId ?? o.current_model_id ?? '').trim();

    for (const item of available) {
        if (!item || typeof item !== 'object') {
            continue;
        }
        const m = item as Record<string, unknown>;
        const valueId = String(m.modelId ?? m.model_id ?? '').trim();
        const name = String(m.name ?? valueId).trim();
        if (!valueId) {
            continue;
        }
        const providerName = parseProviderFromDescription(String(m.description ?? ''));
        let group = groupMap.get(providerName);
        if (!group) {
            group = {
                slug: providerSlugFromDisplayName(providerName),
                name: providerName,
                isPrimary: false,
                models: [],
            };
            groupMap.set(providerName, group);
        }
        if (!group.models.some(x => x.valueId === valueId)) {
            group.models.push({ valueId, name });
        }
    }

    const groups = [...groupMap.values()];
    if (!groups.length) {
        return null;
    }

    if (currentModelId) {
        for (const group of groups) {
            if (group.models.some(m => m.valueId === currentModelId)) {
                group.isPrimary = true;
                break;
            }
        }
    }
    if (!groups.some(g => g.isPrimary)) {
        groups[0].isPrimary = true;
    }

    groups.sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) {
            return a.isPrimary ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
    });

    const currentItem = groups.flatMap(g => g.models).find(m => m.valueId === currentModelId);
    const profileDefault: ProfileDefaultModel | undefined = currentModelId
        ? {
            modelName: currentItem?.name || currentModelId,
            valueId: currentModelId,
            groupSlug: groups.find(g => g.models.some(m => m.valueId === currentModelId))?.slug,
        }
        : undefined;

    return {
        groups,
        flatModels: flattenGroupModels(groups),
        profileDefault,
    };
}

function resolveProfileDefaultFromOptions(
    payload: AcpModelOptionsResponse,
    groups: ModelProviderGroup[]
): ProfileDefaultModel | undefined {
    const modelName = (payload.model ?? '').trim();
    if (!modelName) {
        return undefined;
    }
    const providerSlug = (payload.provider ?? '').trim();
    const primaryGroup =
        groups.find(g => g.isPrimary) ||
        groups.find(g => providerSlug && g.slug.toLowerCase() === providerSlug.toLowerCase()) ||
        groups.find(g => g.models.some(m => m.name === modelName));

    const matched = primaryGroup?.models.find(m => m.name === modelName);
    return {
        modelName,
        valueId: matched?.valueId ?? encodeHermesModelValueId(providerSlug || primaryGroup?.slug, modelName),
        groupSlug: primaryGroup?.slug,
    };
}

export function parseProviderFromDescription(description: string): string {
    const match = description.match(/Provider:\s*([^•]+)/i);
    if (match) {
        return match[1].trim();
    }
    return 'Models';
}

function providerSlugFromDisplayName(name: string): string {
    const normalized = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized || normalized === 'models') {
        return 'custom';
    }
    return normalized.includes(':') ? normalized : `custom:${normalized}`;
}

/** Prefer Hermes ``model.options``; fall back to session ``models.availableModels``. */
export function resolveModelCatalog(
    modelOptions: AcpModelOptionsResponse | null | undefined,
    hermesModelsRaw: unknown
): ProfileModelCatalog | null {
    if (modelOptions?.providers?.length) {
        const catalog = buildCatalogFromModelOptions(modelOptions);
        if (catalog.groups.length > 0) {
            return catalog;
        }
    }
    return buildCatalogFromHermesModelsRaw(hermesModelsRaw);
}

function flattenGroupModels(groups: ModelProviderGroup[]): ModelListItem[] {
    const flat: ModelListItem[] = [];
    const seen = new Set<string>();
    for (const group of groups) {
        for (const model of group.models) {
            if (seen.has(model.valueId)) {
                continue;
            }
            seen.add(model.valueId);
            flat.push(model);
        }
    }
    return flat;
}
