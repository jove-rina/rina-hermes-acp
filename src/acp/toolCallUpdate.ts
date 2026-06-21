import { extractTextFromContentBlock } from './contentText';

export type ToolCallStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export type ToolCallUpdateView = {
    toolCallId: string;
    status: ToolCallStatus;
    title: string;
    body?: string;
    kind?: string;
};

export type ToolCallUpdateHandler = (update: ToolCallUpdateView) => void;

const TERMINAL_STATUSES: ReadonlySet<ToolCallStatus> = new Set([
    'completed',
    'failed',
    'cancelled',
]);

const TOOL_CALL_ICONS: Record<ToolCallStatus, string> = {
    pending: '🔧',
    in_progress: '⚙️',
    completed: '✅',
    failed: '❌',
    cancelled: '⏹',
};

export function normalizeToolCallStatus(
    status: unknown,
    kind: 'tool_call' | 'tool_call_update'
): ToolCallStatus {
    if (status === 'pending' || status === 'in_progress' || status === 'completed' || status === 'failed') {
        return status;
    }
    return kind === 'tool_call' ? 'pending' : 'in_progress';
}

export function extractToolCallBody(update: Record<string, unknown>): string | undefined {
    const parts: string[] = [];

    const fromContent = extractTextFromContentBlock(update.content);
    if (fromContent.trim()) {
        parts.push(fromContent.trim());
    }

    const rawInput = formatToolCallRawValue(update.rawInput ?? update.raw_input);
    if (rawInput && !parts.includes(rawInput)) {
        parts.push(rawInput);
    }

    const rawOutput = formatToolCallRawValue(update.rawOutput ?? update.raw_output);
    if (rawOutput && !parts.includes(rawOutput)) {
        parts.push(rawOutput);
    }

    const description = update.description;
    if (typeof description === 'string' && description.trim()) {
        const trimmed = description.trim();
        if (!parts.includes(trimmed)) {
            parts.push(trimmed);
        }
    }

    if (parts.length === 0) {
        return undefined;
    }
    return parts.join('\n\n');
}

function formatToolCallRawValue(value: unknown): string | undefined {
    if (value == null) {
        return undefined;
    }
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || undefined;
    }
    try {
        return JSON.stringify(value, null, 2);
    } catch {
        return String(value);
    }
}

export function formatToolCallSummary(status: ToolCallStatus, title: string): string {
    return `${TOOL_CALL_ICONS[status]} ${title}`;
}

export function formatToolCallDisplay(view: ToolCallUpdateView): string {
    const summary = formatToolCallSummary(view.status, view.title);
    const body = view.body?.trim();
    if (!body) {
        return summary;
    }
    return `${summary}\n\n${body}`;
}

export function parseToolCallSessionUpdate(
    update: Record<string, unknown>,
    kind: 'tool_call' | 'tool_call_update'
): ToolCallUpdateView | null {
    const toolCallId = update.toolCallId;
    if (typeof toolCallId !== 'string' || !toolCallId) {
        return null;
    }

    const status = normalizeToolCallStatus(update.status, kind);
    const title = String(update.title ?? 'Tool');
    const body = extractToolCallBody(update);
    const kindValue = update.kind;

    return {
        toolCallId,
        status,
        title,
        body: body || undefined,
        kind: typeof kindValue === 'string' ? kindValue : undefined,
    };
}

function mergeToolCallBodies(prev?: string, incoming?: string): string | undefined {
    const next = incoming?.trim();
    const prior = prev?.trim();
    if (!next) {
        return prior;
    }
    if (!prior) {
        return next;
    }
    if (prior === next || prior.includes(next) || next.includes(prior)) {
        return prior.length >= next.length ? prior : next;
    }
    return `${prior}\n\n${next}`;
}

export class ToolCallTracker {
    private _active = new Map<string, ToolCallUpdateView>();

    get activeCount(): number {
        return this._active.size;
    }

    apply(incoming: ToolCallUpdateView): ToolCallUpdateView {
        const prev = this._active.get(incoming.toolCallId);
        const merged: ToolCallUpdateView = {
            toolCallId: incoming.toolCallId,
            status: incoming.status,
            title: incoming.title || prev?.title || 'Tool',
            kind: incoming.kind ?? prev?.kind,
            body: mergeToolCallBodies(prev?.body, incoming.body),
        };

        if (TERMINAL_STATUSES.has(merged.status)) {
            this._active.delete(incoming.toolCallId);
        } else {
            this._active.set(incoming.toolCallId, merged);
        }

        return merged;
    }

    cancelActive(): ToolCallUpdateView[] {
        const cancelled: ToolCallUpdateView[] = [];
        for (const [toolCallId, view] of this._active) {
            if (view.status === 'pending' || view.status === 'in_progress') {
                cancelled.push({
                    ...view,
                    toolCallId,
                    status: 'cancelled',
                });
            }
        }
        for (const view of cancelled) {
            this._active.delete(view.toolCallId);
        }
        return cancelled;
    }

    clear(): void {
        this._active.clear();
    }
}
