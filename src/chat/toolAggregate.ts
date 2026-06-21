/** Max non-empty lines for a tool bubble to be considered "short". */
export const TOOL_SHORT_MAX_LINES = 3;

/** Stop merging consecutive short tools once combined content exceeds this. */
export const TOOL_AGGREGATE_MAX_LINES = 12;

export const TOOL_AGGREGATE_SEPARATOR = '\n\n---\n\n';

export function countNonemptyLines(text: string): number {
    const trimmed = text.trim();
    if (!trimmed) {
        return 0;
    }
    return trimmed.split('\n').filter(line => line.trim().length > 0).length;
}

export function isShortToolText(text: string): boolean {
    return countNonemptyLines(text) <= TOOL_SHORT_MAX_LINES;
}

export function isAggregatedToolText(text: string): boolean {
    return text.includes(TOOL_AGGREGATE_SEPARATOR.trim());
}

export function mergeToolTexts(existing: string, incoming: string): string {
    return `${existing.trim()}${TOOL_AGGREGATE_SEPARATOR}${incoming.trim()}`;
}

export function canAggregateToolTexts(existing: string, incoming: string): boolean {
    if (!isShortToolText(incoming)) {
        return false;
    }
    const existingLines = countNonemptyLines(existing);
    if (existingLines > TOOL_SHORT_MAX_LINES && !isAggregatedToolText(existing)) {
        return false;
    }
    return countNonemptyLines(mergeToolTexts(existing, incoming)) <= TOOL_AGGREGATE_MAX_LINES;
}

export function rebuildAggregatedToolText(
    entries: ReadonlyArray<{ text: string }>
): string {
    return entries
        .map(entry => entry.text.trim())
        .filter(Boolean)
        .join(TOOL_AGGREGATE_SEPARATOR);
}
