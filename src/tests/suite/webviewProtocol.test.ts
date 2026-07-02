import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import {
    WEBVIEW_TO_EXTENSION_MESSAGE_TYPES,
    EXTENSION_TO_WEBVIEW_MESSAGE_TYPES,
    isWebviewToExtensionMessageType,
    isExtensionToWebviewMessageType,
} from '../../shared/webview-protocol';

function extractJsConstArray(source: string, name: string): string[] {
    const re = new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\];`, 'm');
    const match = source.match(re);
    assert.ok(match, `missing ${name} in generated webview-protocol.js`);
    return [...match![1].matchAll(/'([^']+)'/g)].map(m => m[1]);
}

describe('webviewProtocol', () => {
    it('generated webview JS matches TS constants', () => {
        const jsPath = path.join(__dirname, '../../../media/src/shared/webview-protocol.js');
        const jsSource = fs.readFileSync(jsPath, 'utf8');
        assert.ok(jsSource.includes('AUTO-GENERATED'), 'media/src/shared/webview-protocol.js must be generated');
        assert.deepStrictEqual(
            extractJsConstArray(jsSource, 'WEBVIEW_TO_EXTENSION_MESSAGE_TYPES'),
            [...WEBVIEW_TO_EXTENSION_MESSAGE_TYPES],
        );
        assert.deepStrictEqual(
            extractJsConstArray(jsSource, 'EXTENSION_TO_WEBVIEW_MESSAGE_TYPES'),
            [...EXTENSION_TO_WEBVIEW_MESSAGE_TYPES],
        );
    });

    it('includes messages handled by HermesChatProvider', () => {
        assert.ok(WEBVIEW_TO_EXTENSION_MESSAGE_TYPES.includes('sendMessage'));
        assert.ok(WEBVIEW_TO_EXTENSION_MESSAGE_TYPES.includes('ready'));
        assert.ok(WEBVIEW_TO_EXTENSION_MESSAGE_TYPES.includes('permissionResponse'));
    });

    it('includes messages handled by webview bridge', () => {
        assert.ok(EXTENSION_TO_WEBVIEW_MESSAGE_TYPES.includes('status'));
        assert.ok(EXTENSION_TO_WEBVIEW_MESSAGE_TYPES.includes('restoreHistory'));
        assert.ok(EXTENSION_TO_WEBVIEW_MESSAGE_TYPES.includes('configureEnvironmentOpen'));
    });

    it('type guards recognize known message types', () => {
        assert.strictEqual(isWebviewToExtensionMessageType('cancel'), true);
        assert.strictEqual(isWebviewToExtensionMessageType('not-a-message'), false);
        assert.strictEqual(isExtensionToWebviewMessageType('tokenUsage'), true);
        assert.strictEqual(isExtensionToWebviewMessageType('not-a-message'), false);
    });
});
