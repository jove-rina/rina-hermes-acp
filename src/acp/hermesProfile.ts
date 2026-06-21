/** Hermes built-in default profile id (`hermes --profile default`). */
export const HERMES_DEFAULT_PROFILE = 'default';

/** Normalize settings / UI values into a Hermes CLI `--profile` argument. */
export function normalizeHermesCliProfile(profile?: string | null): string {
    const trimmed = (profile ?? '').trim();
    if (!trimmed || trimmed === HERMES_DEFAULT_PROFILE) {
        return HERMES_DEFAULT_PROFILE;
    }
    return trimmed;
}

/** Map a CLI profile id to a stable on-disk storage scope key. */
export function scopeKeyForCliProfile(profile?: string | null): string {
    const normalized = normalizeHermesCliProfile(profile);
    if (normalized === HERMES_DEFAULT_PROFILE) {
        return '__default__';
    }
    return normalized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 120) || '__default__';
}
