import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export function resolveDefaultHermesHome(): string {
    const fromEnv = process.env.HERMES_HOME?.trim();
    if (fromEnv) {
        return fromEnv;
    }
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA?.trim();
        if (localAppData) {
            return path.join(localAppData, 'hermes');
        }
        return path.join(os.homedir(), 'AppData', 'Local', 'hermes');
    }
    return path.join(os.homedir(), '.hermes');
}

export function venvHermesCandidates(hermesHome: string): string[] {
    const agentDir = path.join(hermesHome, 'hermes-agent');
    if (process.platform === 'win32') {
        return [
            path.join(agentDir, 'venv', 'Scripts', 'hermes.exe'),
            path.join(agentDir, 'venv', 'Scripts', 'hermes.cmd'),
        ];
    }
    return [path.join(agentDir, 'venv', 'bin', 'hermes')];
}

export function venvPythonCandidates(hermesHome: string): string[] {
    const agentDir = path.join(hermesHome, 'hermes-agent');
    if (process.platform === 'win32') {
        return [path.join(agentDir, 'venv', 'Scripts', 'python.exe')];
    }
    return [path.join(agentDir, 'venv', 'bin', 'python')];
}

/** Ordered Hermes executable candidates for auto-detection. */
export function buildHermesExecutableCandidates(): string[] {
    const candidates = ['hermes'];
    const homes = new Set<string>([
        resolveDefaultHermesHome(),
        path.join(os.homedir(), '.hermes'),
    ]);
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA?.trim() || path.join(os.homedir(), 'AppData', 'Local');
        homes.add(path.join(localAppData, 'hermes'));
    }
    for (const home of homes) {
        candidates.push(...venvHermesCandidates(home));
    }
    if (process.platform === 'win32') {
        candidates.push(path.join(os.homedir(), '.local', 'bin', 'hermes.exe'));
    } else {
        candidates.push(
            path.join(os.homedir(), '.local', 'bin', 'hermes'),
            '/usr/local/bin/hermes',
            '/opt/homebrew/bin/hermes',
        );
    }
    return [...new Set(candidates)];
}

export function collectHermesHomes(): string[] {
    const homes = new Set<string>([
        resolveDefaultHermesHome(),
        path.join(os.homedir(), '.hermes'),
    ]);
    if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA?.trim() || path.join(os.homedir(), 'AppData', 'Local');
        homes.add(path.join(localAppData, 'hermes'));
    }
    const fromEnv = process.env.HERMES_HOME?.trim();
    if (fromEnv) {
        homes.add(fromEnv);
    }
    return [...homes];
}

export async function accessExecutable(filePath: string): Promise<boolean> {
    try {
        const mode = process.platform === 'win32' ? fs.constants.F_OK : fs.constants.X_OK;
        await fs.promises.access(filePath, mode);
        return true;
    } catch {
        return false;
    }
}

export function refreshWindowsPathFromRegistry(): string | undefined {
    if (process.platform !== 'win32') {
        return undefined;
    }
    try {
        const merged = execFileSync(
            'powershell.exe',
            [
                '-NoProfile',
                '-Command',
                '[Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")',
            ],
            { encoding: 'utf8', timeout: 5000, windowsHide: true },
        ).trim();
        return merged || undefined;
    } catch {
        return undefined;
    }
}

export function normalizeExecutableKey(filePath: string): string {
    const normalized = path.normalize(filePath.trim());
    return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function hermesNotFoundMessage(): string {
    if (process.platform === 'win32') {
        const example = path.join(
            process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'),
            'hermes',
            'hermes-agent',
            'venv',
            'Scripts',
            'hermes.exe',
        );
        return (
            'Hermes not found. Install:\n' +
            '  iex (irm https://hermes-agent.nousresearch.com/install.ps1)\n\n' +
            `Or set hermes.path in Settings (e.g. ${example})`
        );
    }
    return (
        'Hermes not found. Install:\n' +
        '  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash'
    );
}
