import { describe, it } from 'mocha';
import assert from 'assert';
import * as os from 'os';
import * as path from 'path';
import { parseProfileListOutput, buildHermesExecutableCandidates } from '../../acp/profileDiscovery';

describe('profileDiscovery', () => {
    it('parseProfileListOutput extracts profile ids and puts default first', () => {
        const sample = `
 Profile          Model                        Gateway      Alias
 ───────────────    ───────────────────────────    ───────────    ───────────
  default         agnes-2.0-flash              running      —
 ◆jove            deepseek-v4-flash            running      jove
  rina            deepseek-v4-flash            running      rina
`;
        const profiles = parseProfileListOutput(sample);
        assert.deepStrictEqual(profiles, ['default', 'jove', 'rina']);
    });

    it('parseProfileListOutput returns default when output is empty', () => {
        assert.deepStrictEqual(parseProfileListOutput(''), ['default']);
    });

    it('buildHermesExecutableCandidates includes platform install paths', () => {
        const candidates = buildHermesExecutableCandidates();
        assert.ok(candidates.includes('hermes'));
        if (process.platform === 'win32') {
            const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
            assert.ok(candidates.some((candidate) =>
                candidate.includes(path.join(localAppData, 'hermes', 'hermes-agent', 'venv', 'Scripts', 'hermes.exe'))
            ));
        } else {
            assert.ok(candidates.some((candidate) => candidate.endsWith(path.join('.hermes', 'hermes-agent', 'venv', 'bin', 'hermes'))));
        }
    });
});
