import { describe, it } from 'mocha';
import assert from 'assert';
import * as path from 'path';
import {
    addHermesDirectoryToSystemPath,
    getHermesExecutableDirectory,
    isDirectoryOnPath,
    normalizeWindowsUserPath,
    sanitizeWindowsPathEntry,
} from '../../acp/hermesPathSetup';

describe('hermesPathSetup', () => {
    it('getHermesExecutableDirectory returns parent directory', () => {
        const executable = path.join('/opt', 'hermes', 'bin', 'hermes');
        assert.strictEqual(
            getHermesExecutableDirectory(executable),
            path.dirname(executable),
        );
    });

    it('isDirectoryOnPath matches normalized entries', () => {
        const dir = path.join('/opt', 'hermes', 'bin');
        const pathValue = [
            path.join('/usr', 'bin'),
            dir,
            path.join('/home', 'user', '.local', 'bin'),
        ].join(path.delimiter);
        assert.strictEqual(isDirectoryOnPath(dir, pathValue), true);
        assert.strictEqual(
            isDirectoryOnPath(path.join('/missing', 'bin'), pathValue),
            false,
        );
    });

    it('addHermesDirectoryToSystemPath reports already present process PATH entries', () => {
        const dir = getHermesExecutableDirectory(process.execPath);
        const result = addHermesDirectoryToSystemPath(process.execPath);
        assert.strictEqual(result.pathEntry, dir);
        assert.strictEqual(result.alreadyPresent, true);
        assert.strictEqual(result.changed, false);
    });

    it('sanitizeWindowsPathEntry collapses doubled backslashes on drive paths', () => {
        assert.strictEqual(
            sanitizeWindowsPathEntry('C:\\\\Users\\\\songjiuzhang\\\\AppData\\\\Local\\\\Microsoft\\\\WindowsApps'),
            'C:\\Users\\songjiuzhang\\AppData\\Local\\Microsoft\\WindowsApps',
        );
    });

    it('normalizeWindowsUserPath repairs and deduplicates Windows PATH entries', () => {
        const input = [
            'C:\\\\hermes\\\\venv\\\\Scripts',
            'C:\\\\hermes\\\\venv\\\\Scripts',
            'C:\\\\Users\\\\bin',
        ].join(';');
        assert.strictEqual(
            normalizeWindowsUserPath(input),
            'C:\\hermes\\venv\\Scripts;C:\\Users\\bin',
        );
    });
});
