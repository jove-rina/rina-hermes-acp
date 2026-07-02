import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const MARKER = '# Added by Rina Hermes ACP';

export interface SystemPathConfigureResult {
    changed: boolean;
    alreadyPresent: boolean;
    pathEntry: string;
    profileFile?: string;
}

function pathsEqual(a: string, b: string): boolean {
    const left = path.normalize(a);
    const right = path.normalize(b);
    return process.platform === 'win32'
        ? left.toLowerCase() === right.toLowerCase()
        : left === right;
}

function splitPathEntries(pathValue: string): string[] {
    const separator = process.platform === 'win32' ? ';' : ':';
    return pathValue
        .split(separator)
        .map((entry) => entry.trim())
        .filter(Boolean);
}

export function isDirectoryOnPath(dir: string, pathValue: string): boolean {
    const normalizedDir = path.normalize(dir);
    return splitPathEntries(pathValue).some((entry) => pathsEqual(entry, normalizedDir));
}

export function sanitizeWindowsPathEntry(entry: string): string {
    const trimmed = entry.trim();
    if (!trimmed) {
        return trimmed;
    }
    if (trimmed.startsWith('\\\\')) {
        return `\\\\${trimmed.slice(2).replace(/\\+/g, '\\')}`;
    }
    return trimmed.replace(/\\+/g, '\\');
}

export function normalizeWindowsUserPath(pathValue: string): string {
    const seen = new Set<string>();
    const entries: string[] = [];
    for (const raw of pathValue.split(';').map((entry) => entry.trim()).filter(Boolean)) {
        const sanitized = sanitizeWindowsPathEntry(raw);
        const key = sanitized.toLowerCase();
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        entries.push(sanitized);
    }
    return entries.join(';');
}

function escapePowerShellSingleQuoted(value: string): string {
    return value.replace(/'/g, "''");
}

function readWindowsUserPath(): string {
    return execFileSync(
        'powershell.exe',
        ['-NoProfile', '-Command', '[Environment]::GetEnvironmentVariable("Path","User")'],
        { encoding: 'utf8', timeout: 5000, windowsHide: true },
    ).trim();
}

function writeWindowsUserPath(pathValue: string): void {
    const normalized = normalizeWindowsUserPath(pathValue);
    const escaped = escapePowerShellSingleQuoted(normalized);
    execFileSync(
        'powershell.exe',
        [
            '-NoProfile',
            '-Command',
            `[Environment]::SetEnvironmentVariable('Path', '${escaped}', 'User')`,
        ],
        { timeout: 5000, windowsHide: true },
    );
}

function unixShellProfileCandidates(): string[] {
    const home = os.homedir();
    if (process.platform === 'darwin') {
        return [
            path.join(home, '.zprofile'),
            path.join(home, '.zshrc'),
            path.join(home, '.bash_profile'),
            path.join(home, '.profile'),
        ];
    }
    return [
        path.join(home, '.bashrc'),
        path.join(home, '.profile'),
        path.join(home, '.zshrc'),
    ];
}

function resolveUnixProfileFile(): string {
    for (const candidate of unixShellProfileCandidates()) {
        if (fs.existsSync(candidate)) {
            return candidate;
        }
    }
    return process.platform === 'darwin'
        ? path.join(os.homedir(), '.zprofile')
        : path.join(os.homedir(), '.profile');
}

function readUnixProfilePaths(profileFile: string): string[] {
    if (!fs.existsSync(profileFile)) {
        return [];
    }
    const content = fs.readFileSync(profileFile, 'utf8');
    const paths: string[] = [];
    for (const line of content.split(/\r?\n/)) {
        const match = line.match(/^\s*export\s+PATH=(.+)$/);
        if (!match) {
            continue;
        }
        const raw = match[1].trim();
        const unquoted = raw.replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1');
        paths.push(...splitPathEntries(unquoted.replace(/\$PATH/g, '')));
    }
    return paths;
}

export function getHermesExecutableDirectory(executable: string): string {
    return path.dirname(path.normalize(executable));
}

export function addHermesDirectoryToSystemPath(executable: string): SystemPathConfigureResult {
    const pathEntry = getHermesExecutableDirectory(executable);

    if (process.platform === 'win32') {
        const userPath = readWindowsUserPath();
        const processPath = process.env.PATH || process.env.Path || '';
        const pathEntryNormalized = sanitizeWindowsPathEntry(pathEntry);
        if (isDirectoryOnPath(pathEntryNormalized, userPath) || isDirectoryOnPath(pathEntryNormalized, processPath)) {
            return { changed: false, alreadyPresent: true, pathEntry: pathEntryNormalized };
        }
        const next = userPath
            ? normalizeWindowsUserPath(`${pathEntryNormalized};${userPath}`)
            : pathEntryNormalized;
        writeWindowsUserPath(next);
        return { changed: true, alreadyPresent: false, pathEntry: pathEntryNormalized };
    }

    const processPath = process.env.PATH || '';
    if (isDirectoryOnPath(pathEntry, processPath)) {
        return { changed: false, alreadyPresent: true, pathEntry };
    }

    const profileFile = resolveUnixProfileFile();
    const profilePaths = readUnixProfilePaths(profileFile);
    if (profilePaths.some((entry) => pathsEqual(entry, pathEntry))) {
        return { changed: false, alreadyPresent: true, pathEntry, profileFile };
    }

    const exportLine = `export PATH="$PATH:${pathEntry.replace(/"/g, '\\"')}"`;
    const block = `\n${MARKER}\n${exportLine}\n`;
    if (fs.existsSync(profileFile)) {
        const existing = fs.readFileSync(profileFile, 'utf8');
        if (existing.includes(MARKER) || existing.includes(exportLine)) {
            return { changed: false, alreadyPresent: true, pathEntry, profileFile };
        }
        fs.appendFileSync(profileFile, block, 'utf8');
    } else {
        fs.mkdirSync(path.dirname(profileFile), { recursive: true });
        fs.writeFileSync(profileFile, `${block.trim()}\n`, 'utf8');
    }
    return { changed: true, alreadyPresent: false, pathEntry, profileFile };
}
