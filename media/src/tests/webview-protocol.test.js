import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
    WEBVIEW_TO_EXTENSION_MESSAGE_TYPES,
    EXTENSION_TO_WEBVIEW_MESSAGE_TYPES,
    isWebviewToExtensionMessageType,
    isExtensionToWebviewMessageType,
} from '../shared/webview-protocol.js';

/** @param {string} source @param {string} name */
function extractTsConstArray(source, name) {
    const re = new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\] as const;`, 'm');
    const match = source.match(re);
    if (!match) {
        throw new Error(`missing ${name} in webview-protocol.ts`);
    }
    return [...match[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
}

describe('webview-protocol constants', () => {
    it('is generated from src/shared/webview-protocol.ts', () => {
        const jsSource = readFileSync(join(process.cwd(), 'media/src/shared/webview-protocol.js'), 'utf8');
        expect(jsSource).toContain('AUTO-GENERATED');
        const tsSource = readFileSync(join(process.cwd(), 'src/shared/webview-protocol.ts'), 'utf8');
        expect(WEBVIEW_TO_EXTENSION_MESSAGE_TYPES).toEqual(
            extractTsConstArray(tsSource, 'WEBVIEW_TO_EXTENSION_MESSAGE_TYPES'),
        );
        expect(EXTENSION_TO_WEBVIEW_MESSAGE_TYPES).toEqual(
            extractTsConstArray(tsSource, 'EXTENSION_TO_WEBVIEW_MESSAGE_TYPES'),
        );
    });

    it('type guards recognize known message types', () => {
        expect(isWebviewToExtensionMessageType('cancel')).toBe(true);
        expect(isWebviewToExtensionMessageType('not-a-message')).toBe(false);
        expect(isExtensionToWebviewMessageType('tokenUsage')).toBe(true);
        expect(isExtensionToWebviewMessageType('not-a-message')).toBe(false);
    });

    it('lists core webview → extension types', () => {
        expect(WEBVIEW_TO_EXTENSION_MESSAGE_TYPES).toContain('ready');
        expect(WEBVIEW_TO_EXTENSION_MESSAGE_TYPES).toContain('sendMessage');
        expect(WEBVIEW_TO_EXTENSION_MESSAGE_TYPES).toContain('switchSession');
    });

    it('lists core extension → webview types', () => {
        expect(EXTENSION_TO_WEBVIEW_MESSAGE_TYPES).toContain('status');
        expect(EXTENSION_TO_WEBVIEW_MESSAGE_TYPES).toContain('addMessage');
        expect(EXTENSION_TO_WEBVIEW_MESSAGE_TYPES).toContain('restoreHistory');
    });

    it('has no duplicate entries', () => {
        expect(new Set(WEBVIEW_TO_EXTENSION_MESSAGE_TYPES).size)
            .toBe(WEBVIEW_TO_EXTENSION_MESSAGE_TYPES.length);
        expect(new Set(EXTENSION_TO_WEBVIEW_MESSAGE_TYPES).size)
            .toBe(EXTENSION_TO_WEBVIEW_MESSAGE_TYPES.length);
    });
});
