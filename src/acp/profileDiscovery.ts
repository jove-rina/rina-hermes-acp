import { spawn } from 'child_process';
import {
    accessExecutable,
    hermesNotFoundMessage,
} from './hermesPaths';
import { scanHermesExecutables } from './hermesEnvironmentDetect';

export { buildHermesExecutableCandidates } from './hermesPaths';
export {
    detectHermesEnvironment,
    scanHermesExecutables,
    tryResolveHermesQuick,
} from './hermesEnvironmentDetect';
export type {
    HermesDetectProgressEvent,
    HermesDetectSource,
    HermesDetectStepId,
    HermesDetectStepStatus,
    HermesEnvironmentReport,
    HermesEnvironmentStatus,
    HermesExecutableCandidate,
    HermesInstallMethod,
} from './hermesEnvironmentDetect';

/** Parse ``hermes profile list`` table output into profile ids (default first). */
export function parseProfileListOutput(output: string): string[] {
    const profiles: string[] = [];
    for (const line of output.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || /^profile\b/i.test(trimmed) || /^[─\-=]/.test(trimmed)) {
            continue;
        }
        const cleaned = trimmed.replace(/^◆\s*/, '');
        const match = cleaned.match(/^([a-zA-Z0-9_.-]+)/);
        if (match) {
            profiles.push(match[1]);
        }
    }
    const unique = [...new Set(profiles)];
    const defaultIdx = unique.indexOf('default');
    if (defaultIdx === -1) {
        unique.unshift('default');
    } else if (defaultIdx > 0) {
        unique.splice(defaultIdx, 1);
        unique.unshift('default');
    }
    return unique;
}

export async function findHermesExecutable(hermesPath?: string): Promise<string | null> {
    if (hermesPath?.trim()) {
        if (await accessExecutable(hermesPath.trim())) {
            return hermesPath.trim();
        }
        return null;
    }

    const scanned = await scanHermesExecutables();
    return scanned[0] ?? null;
}

export async function findHermesExecutableOrThrow(hermesPath?: string): Promise<string> {
    const resolved = hermesPath
        ? await findHermesExecutable(hermesPath)
        : await findHermesExecutable();
    if (!resolved) {
        throw new Error(hermesNotFoundMessage());
    }
    return resolved;
}

export function runHermesCommand(executable: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        const proc = spawn(executable, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: process.platform === 'win32',
        });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            proc.kill();
            reject(new Error('hermes profile list timed out'));
        }, 15_000);

        proc.stdout?.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
        });
        proc.stderr?.on('data', (chunk: Buffer) => {
            stderr += chunk.toString();
        });
        proc.on('error', (err) => {
            clearTimeout(timer);
            reject(err);
        });
        proc.on('exit', (code) => {
            clearTimeout(timer);
            if (code === 0) {
                resolve(stdout);
            } else {
                reject(new Error(stderr.trim() || `hermes exited with code ${code}`));
            }
        });
    });
}

/** Discover installed Hermes profiles via ``hermes profile list``. */
export async function discoverHermesProfiles(hermesPath?: string): Promise<string[]> {
    const executable = await findHermesExecutable(hermesPath);
    if (!executable) {
        return ['default'];
    }
    const output = await runHermesCommand(executable, ['profile', 'list']);
    const profiles = parseProfileListOutput(output);
    return profiles.length > 0 ? profiles : ['default'];
}
