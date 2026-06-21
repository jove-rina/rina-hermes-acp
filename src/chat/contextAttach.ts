import { LocaleStrings } from '../i18n/types';

export type ContextAttachMode = 'none' | 'last2' | 'last10' | 'all' | 'custom';

export interface ContextAttachOption {
    mode: ContextAttachMode;
    /** Session message indices for custom mode. */
    indices?: number[];
}

export interface AttachableMessage {
    role: string;
    text: string;
}

const MEMORY_ROLES = new Set(['user', 'assistant', 'permission']);

/** Rough char budget for injected prior-session memory (~8k tokens). */
export const MAX_CONTEXT_ATTACH_CHARS = 32_000;

export function isAttachableRole(role: string): boolean {
    return MEMORY_ROLES.has(role);
}

export function truncateAttachMessages<T extends AttachableMessage>(
    messages: T[],
    maxChars: number = MAX_CONTEXT_ATTACH_CHARS
): T[] {
    if (messages.length === 0 || maxChars <= 0) {
        return [];
    }
    const picked: T[] = [];
    let total = 0;
    for (let i = messages.length - 1; i >= 0; i--) {
        const text = (messages[i].text || '').trim();
        if (!text) {
            continue;
        }
        if (total + text.length > maxChars && picked.length > 0) {
            break;
        }
        picked.unshift(messages[i]);
        total += text.length;
        if (total >= maxChars) {
            break;
        }
    }
    return picked;
}

export function filterAttachableMessages<T extends AttachableMessage>(messages: T[]): T[] {
    return messages.filter(m => isAttachableRole(m.role) && (m.text || '').trim());
}

export function resolveAttachMessages<T extends AttachableMessage>(
    messages: T[],
    option: ContextAttachOption | undefined
): T[] {
    if (!option || option.mode === 'none' || messages.length === 0) {
        return [];
    }
    switch (option.mode) {
        case 'last2':
            return messages.slice(-2);
        case 'last10':
            return messages.slice(-10);
        case 'all':
            return truncateAttachMessages(messages.slice());
        default:
            return [];
    }
}

export function resolveCustomAttachMessages<T extends AttachableMessage>(
    allMessages: T[],
    indices?: number[]
): T[] {
    if (!indices?.length || allMessages.length === 0) {
        return [];
    }
    const picked: T[] = [];
    for (const index of indices) {
        if (typeof index !== 'number' || index < 0 || index >= allMessages.length) {
            continue;
        }
        const message = allMessages[index];
        if (
            !message
            || !isAttachableRole(message.role)
            || !(message.text || '').trim()
            || picked.includes(message)
        ) {
            continue;
        }
        picked.push(message);
    }
    return picked;
}

function attachRoleLabel(role: string, loc: LocaleStrings): string {
    switch (role) {
        case 'user':
            return loc.roleYou;
        case 'assistant':
            return loc.roleHermes;
        case 'permission':
            return loc.permissionTitle;
        case 'thought':
            return loc.roleThought;
        case 'tool':
            return loc.roleTool;
        default:
            return loc.roleMessage;
    }
}

export function buildContextAttachPrefix(
    messages: AttachableMessage[],
    loc: LocaleStrings
): string {
    if (messages.length === 0) {
        return '';
    }
    const lines = [loc.contextAttachPrefixHeader, ''];
    for (const message of messages) {
        const text = (message.text || '').trim();
        if (!text) {
            continue;
        }
        lines.push(`[${attachRoleLabel(message.role, loc)}]`, text, '');
    }
    lines.push('---');
    return lines.join('\n').trim();
}

export function composePromptWithContext(
    userText: string,
    contextMessages: AttachableMessage[],
    loc: LocaleStrings
): string {
    const prefix = buildContextAttachPrefix(contextMessages, loc);
    if (!prefix) {
        return userText;
    }
    return `${prefix}\n\n${userText}`;
}
