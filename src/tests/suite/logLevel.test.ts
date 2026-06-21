import * as assert from 'assert';
import { classifyLogLevel } from '../../logLevel';

suite('logLevel', () => {
    it('classifies error lines', () => {
        assert.strictEqual(classifyLogLevel('ERROR: connection refused'), 'error');
        assert.strictEqual(classifyLogLevel('Connect failed: timeout'), 'error');
        assert.strictEqual(classifyLogLevel('Process exited (code: 1, signal: null)'), 'error');
        assert.strictEqual(classifyLogLevel('Connection lost'), 'error');
    });

    it('classifies warning lines', () => {
        assert.strictEqual(classifyLogLevel('WARNING: deprecated API'), 'warning');
        assert.strictEqual(classifyLogLevel('[WARN] retrying'), 'warning');
    });

    it('ignores informational lines', () => {
        assert.strictEqual(classifyLogLevel('session/new cwd=/tmp mcpServers=0'), null);
        assert.strictEqual(classifyLogLevel('model.options unavailable: not found'), null);
        assert.strictEqual(classifyLogLevel('Status: ready'), null);
    });
});
