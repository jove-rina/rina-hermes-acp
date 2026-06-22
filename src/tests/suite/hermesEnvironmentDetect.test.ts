import { describe, it } from 'mocha';
import assert from 'assert';
import {
    buildRecommendation,
    inferInstallMethod,
    isAcpCheckOk,
    parsePipShowLocation,
} from '../../acp/hermesEnvironmentDetect';
import type { HermesExecutableCandidate } from '../../acp/hermesEnvironmentDetect';

describe('hermesEnvironmentDetect', () => {
    it('parsePipShowLocation extracts Location field', () => {
        const output = [
            'Name: hermes-agent',
            'Version: 1.0.0',
            'Location: /home/user/.local/lib/python3.11/site-packages',
        ].join('\n');
        assert.strictEqual(
            parsePipShowLocation(output),
            '/home/user/.local/lib/python3.11/site-packages',
        );
    });

    it('inferInstallMethod prefers pip when pip probe succeeded', () => {
        assert.strictEqual(
            inferInstallMethod([], true),
            'pip',
        );
    });

    it('inferInstallMethod detects git/native installs', () => {
        const executables: HermesExecutableCandidate[] = [{
            path: '/home/user/.hermes/hermes-agent/venv/bin/hermes',
            source: 'known_path',
            verified: true,
        }];
        assert.strictEqual(inferInstallMethod(executables, false), 'git/native');
    });

    it('buildRecommendation suggests reinstall when nothing verified', () => {
        const executables: HermesExecutableCandidate[] = [{
            path: '/tmp/hermes',
            source: 'known_path',
            verified: false,
        }];
        assert.strictEqual(buildRecommendation(executables).action, 'reinstall');
    });

    it('buildRecommendation suggests configure_system when verified but not on PATH', () => {
        const dir = process.platform === 'win32' ? 'C:\\missing\\hermes\\bin' : '/missing/hermes/bin';
        const executable = process.platform === 'win32'
            ? `${dir}\\hermes.exe`
            : `${dir}/hermes`;
        const executables: HermesExecutableCandidate[] = [{
            path: executable,
            source: 'known_path',
            verified: true,
        }];
        const recommendation = buildRecommendation(executables, '');
        assert.strictEqual(recommendation.action, 'configure_system');
        assert.strictEqual(recommendation.pluginPath, executable);
    });

    it('isAcpCheckOk accepts Hermes ACP check OK output', () => {
        assert.strictEqual(isAcpCheckOk('Hermes ACP check OK\n', 0), true);
        assert.strictEqual(isAcpCheckOk('ModuleNotFoundError: No module named acp', 1), false);
        assert.strictEqual(isAcpCheckOk('Hermes ACP check OK', null), false);
    });
});
