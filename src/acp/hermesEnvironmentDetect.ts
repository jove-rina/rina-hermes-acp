import { execFile, spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
    accessExecutable,
    buildHermesExecutableCandidates,
    collectHermesHomes,
    normalizeExecutableKey,
    refreshWindowsPathFromRegistry,
    resolveDefaultHermesHome,
    venvHermesCandidates,
    venvPythonCandidates,
} from './hermesPaths';
import { getHermesExecutableDirectory, isDirectoryOnPath } from './hermesPathSetup';

export type HermesDetectSource =
    | 'config'
    | 'path_lookup'
    | 'known_path'
    | 'pip'
    | 'python_import'
    | 'hermes_home';

export type HermesInstallMethod = 'pip' | 'git/native' | 'homebrew' | 'unknown';

export type HermesEnvironmentStatus = 'ready' | 'found_unverified' | 'broken' | 'not_found' | 'cancelled';

export interface HermesExecutableCandidate {
    path: string;
    source: HermesDetectSource;
    verified: boolean;
    version?: string;
}

export interface HermesEnvironmentDiagnostics {
    extensionPath: string;
    registryPath?: string;
    pipInstalled: boolean;
    pythonImportOk: boolean;
    hermesHome?: string;
    acpOk: boolean;
    acpVersion?: string;
    acpInstallAttempted?: boolean;
    acpDetail?: string;
}

export interface HermesEnvironmentRecommendation {
    pluginPath?: string;
    systemPathDir?: string;
    action: 'configure_plugin' | 'configure_system' | 'reinstall' | 'none';
}

export interface HermesEnvironmentReport {
    status: HermesEnvironmentStatus;
    executables: HermesExecutableCandidate[];
    installMethod?: HermesInstallMethod;
    diagnostics: HermesEnvironmentDiagnostics;
    recommendation: HermesEnvironmentRecommendation;
}

export type HermesDetectStepId =
    | 'config'
    | 'path_lookup'
    | 'known_path'
    | 'pip'
    | 'python_import'
    | 'hermes_home'
    | 'verify'
    | 'acp_check'
    | 'acp_install'
    | 'summary';

export type HermesDetectStepStatus = 'running' | 'ok' | 'skip' | 'fail';

export interface HermesDetectProgressEvent {
    step: HermesDetectStepId;
    status: HermesDetectStepStatus;
    detail?: string;
    paths?: string[];
    count?: number;
    verifiedCount?: number;
    totalCount?: number;
    reportStatus?: HermesEnvironmentStatus;
}

export interface DetectHermesEnvironmentOptions {
    onProgress?: (event: HermesDetectProgressEvent) => void;
    signal?: AbortSignal;
}

const VERIFY_TIMEOUT_MS = 8000;
const PROBE_TIMEOUT_MS = 8000;
const ACP_INSTALL_TIMEOUT_MS = 120_000;
export const ACP_PROTOCOL_PACKAGE = 'agent-client-protocol==0.9.0';

function buildEmptyDiagnostics(): HermesEnvironmentDiagnostics {
    return {
        extensionPath: process.env.PATH || process.env.Path || '',
        pipInstalled: false,
        pythonImportOk: false,
        acpOk: false,
    };
}

function buildCancelledReport(): HermesEnvironmentReport {
    return {
        status: 'cancelled',
        executables: [],
        diagnostics: buildEmptyDiagnostics(),
        recommendation: { action: 'none' },
    };
}

function cancelledIfAborted(signal?: AbortSignal): HermesEnvironmentReport | null {
    return signal?.aborted ? buildCancelledReport() : null;
}

function execText(command: string, args: string[], env?: NodeJS.ProcessEnv): Promise<string | null> {
    return execCommand(command, args, { env }).then((result) => {
        if (result.code !== 0) {
            return null;
        }
        return (result.stdout || result.stderr).trim() || null;
    });
}

function execCommand(
    command: string,
    args: string[],
    options?: { timeout?: number; env?: NodeJS.ProcessEnv },
): Promise<{ code: number | null; stdout: string; stderr: string }> {
    return new Promise((resolve) => {
        const proc = execFile(
            command,
            args,
            {
                timeout: options?.timeout ?? PROBE_TIMEOUT_MS,
                windowsHide: true,
                env: options?.env ?? process.env,
                maxBuffer: 1024 * 1024,
            },
            (error, stdout, stderr) => {
                resolve({
                    code: typeof error?.code === 'number' ? error.code : error ? 1 : 0,
                    stdout: stdout?.toString() ?? '',
                    stderr: stderr?.toString() ?? '',
                });
            },
        );
        proc.on('error', () => resolve({ code: null, stdout: '', stderr: '' }));
    });
}

export function isAcpCheckOk(output: string, exitCode: number | null): boolean {
    return exitCode === 0 && /Hermes ACP check OK/i.test(output);
}

function combineProcessOutput(stdout: string, stderr: string): string {
    return `${stdout}\n${stderr}`.replace(/\0/g, '').trim();
}

function resolvePythonForHermes(executable: string): string[] {
    const candidates: string[] = [];
    const dir = path.dirname(executable);
    if (process.platform === 'win32') {
        if (path.basename(dir).toLowerCase() === 'scripts') {
            candidates.push(path.join(path.dirname(dir), 'python.exe'));
            candidates.push(path.join(path.dirname(dir), 'Scripts', 'python.exe'));
        }
    } else if (path.basename(dir) === 'bin') {
        candidates.push(path.join(dir, 'python3'));
        candidates.push(path.join(dir, 'python'));
    }
    return [...new Set([...candidates, ...buildPythonCandidates()])];
}

export async function checkHermesAcp(
    executable: string,
): Promise<{ ok: boolean; output: string; version?: string }> {
    const checkResult = await new Promise<{ code: number | null; output: string }>((resolve) => {
        const proc = spawn(executable, ['acp', '--check'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: process.platform === 'win32',
        });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            proc.kill();
            resolve({ code: null, output: combineProcessOutput(stdout, stderr) });
        }, VERIFY_TIMEOUT_MS);

        proc.stdout?.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
        });
        proc.stderr?.on('data', (chunk: Buffer) => {
            stderr += chunk.toString();
        });
        proc.on('error', () => {
            clearTimeout(timer);
            resolve({ code: null, output: combineProcessOutput(stdout, stderr) });
        });
        proc.on('exit', (code) => {
            clearTimeout(timer);
            resolve({ code, output: combineProcessOutput(stdout, stderr) });
        });
    });

    if (!isAcpCheckOk(checkResult.output, checkResult.code)) {
        return { ok: false, output: checkResult.output };
    }

    const versionResult = await execCommand(executable, ['acp', '--version']);
    const versionOutput = combineProcessOutput(versionResult.stdout, versionResult.stderr);
    const version = versionOutput.split(/\r?\n/).map((line) => line.trim()).find(Boolean);
    return { ok: true, output: checkResult.output, version };
}

export async function installAcpDependencies(
    hermesExecutable: string,
): Promise<{ ok: boolean; detail?: string }> {
    let lastDetail: string | undefined;
    for (const python of resolvePythonForHermes(hermesExecutable)) {
        const { command, args: prefixArgs } = resolvePythonInvocation(python);
        const result = await execCommand(
            command,
            [...prefixArgs, '-m', 'pip', 'install', ACP_PROTOCOL_PACKAGE],
            { timeout: ACP_INSTALL_TIMEOUT_MS },
        );
        const combined = combineProcessOutput(result.stdout, result.stderr);
        if (result.code === 0) {
            return { ok: true, detail: combined || ACP_PROTOCOL_PACKAGE };
        }
        lastDetail = combined || `exit ${result.code ?? 'unknown'}`;
    }
    return { ok: false, detail: lastDetail ?? 'pip install failed' };
}

function buildPythonCandidates(): string[] {
    const candidates: string[] = [];
    for (const home of collectHermesHomes()) {
        candidates.push(...venvPythonCandidates(home));
    }
    if (process.platform === 'win32') {
        candidates.push('py', 'python', 'python3');
    } else {
        candidates.push('python3', 'python');
    }
    return [...new Set(candidates)];
}

function resolvePythonInvocation(candidate: string): { command: string; args: string[] } {
    if (candidate === 'py' && process.platform === 'win32') {
        return { command: 'py', args: ['-3'] };
    }
    return { command: candidate, args: [] };
}

async function runPythonScript(
    candidate: string,
    script: string,
): Promise<string | null> {
    const { command, args: prefixArgs } = resolvePythonInvocation(candidate);
    const args = [...prefixArgs, '-c', script];
    return execText(command, args);
}

async function probePathLookup(
    add: (filePath: string, source: HermesDetectSource) => Promise<void>,
): Promise<void> {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const refreshedPath = refreshWindowsPathFromRegistry();
    const env = refreshedPath
        ? { ...process.env, Path: refreshedPath, PATH: refreshedPath }
        : process.env;

    const resolved = await new Promise<string[] | null>((resolve) => {
        const proc = spawn(whichCmd, ['hermes'], {
            stdio: ['ignore', 'pipe', 'ignore'],
            shell: process.platform === 'win32',
            env,
        });
        let stdout = '';
        proc.stdout?.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
        });
        proc.on('exit', (code) => {
            if (code !== 0) {
                resolve(null);
                return;
            }
            resolve(
                stdout
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean),
            );
        });
        proc.on('error', () => resolve(null));
    });

    if (!resolved) {
        return;
    }
    for (const item of resolved) {
        if (path.isAbsolute(item) && await accessExecutable(item)) {
            await add(item, 'path_lookup');
        }
    }
}

async function probeKnownPaths(
    add: (filePath: string, source: HermesDetectSource) => Promise<void>,
): Promise<void> {
    for (const candidate of buildHermesExecutableCandidates()) {
        if (!path.isAbsolute(candidate)) {
            continue;
        }
        if (await accessExecutable(candidate)) {
            await add(candidate, 'known_path');
        }
    }
}

async function probeHermesHomePaths(
    add: (filePath: string, source: HermesDetectSource) => Promise<void>,
): Promise<void> {
    for (const home of collectHermesHomes()) {
        for (const candidate of venvHermesCandidates(home)) {
            if (await accessExecutable(candidate)) {
                await add(candidate, 'hermes_home');
            }
        }
    }
}

export function parsePipShowLocation(output: string): string | undefined {
    for (const line of output.split(/\r?\n/)) {
        const match = line.match(/^Location:\s*(.+)$/i);
        if (match) {
            return match[1].trim();
        }
    }
    return undefined;
}

async function probePipInstall(
    add: (filePath: string, source: HermesDetectSource) => Promise<void>,
): Promise<{ pipInstalled: boolean; installMethod?: HermesInstallMethod }> {
    for (const python of buildPythonCandidates()) {
        const { command, args: prefixArgs } = resolvePythonInvocation(python);
        const output = await execText(command, [...prefixArgs, '-m', 'pip', 'show', 'hermes-agent']);
        if (!output || !/^Name:\s*hermes-agent/im.test(output)) {
            continue;
        }

        const scriptOutput = await runPythonScript(
            python,
            [
                'import os, sysconfig',
                `name = 'hermes.exe' if os.name == 'nt' else 'hermes'`,
                `print(os.path.join(sysconfig.get_path('scripts'), name))`,
            ].join('\n'),
        );
        if (scriptOutput && await accessExecutable(scriptOutput)) {
            await add(scriptOutput, 'pip');
            return { pipInstalled: true, installMethod: 'pip' };
        }

        const location = parsePipShowLocation(output);
        if (location) {
            const fallback = process.platform === 'win32'
                ? path.join(os.homedir(), 'AppData', 'Roaming', 'Python', 'Scripts', 'hermes.exe')
                : path.join(os.homedir(), '.local', 'bin', 'hermes');
            if (await accessExecutable(fallback)) {
                await add(fallback, 'pip');
                return { pipInstalled: true, installMethod: 'pip' };
            }
        }
        return { pipInstalled: true, installMethod: 'pip' };
    }
    return { pipInstalled: false };
}

async function probePythonImport(
    add: (filePath: string, source: HermesDetectSource) => Promise<void>,
): Promise<boolean> {
    const script = [
        'import os, sys',
        'import hermes_cli  # noqa: F401',
        `name = 'hermes.exe' if os.name == 'nt' else 'hermes'`,
        `print(os.path.join(os.path.dirname(sys.executable), name))`,
    ].join('\n');

    for (const python of buildPythonCandidates()) {
        const output = await runPythonScript(python, script);
        if (output && await accessExecutable(output)) {
            await add(output, 'python_import');
            return true;
        }
    }
    return false;
}

async function verifyExecutable(executable: string): Promise<{ verified: boolean; version?: string }> {
    return new Promise((resolve) => {
        const proc = spawn(executable, ['--version'], {
            stdio: ['ignore', 'pipe', 'pipe'],
            shell: process.platform === 'win32',
        });
        let stdout = '';
        let stderr = '';
        const timer = setTimeout(() => {
            proc.kill();
            resolve({ verified: false });
        }, VERIFY_TIMEOUT_MS);

        proc.stdout?.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
        });
        proc.stderr?.on('data', (chunk: Buffer) => {
            stderr += chunk.toString();
        });
        proc.on('error', () => {
            clearTimeout(timer);
            resolve({ verified: false });
        });
        proc.on('exit', (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                resolve({ verified: false });
                return;
            }
            const version = (stdout || stderr).trim().split(/\r?\n/)[0]?.trim();
            resolve({ verified: true, version: version || undefined });
        });
    });
}

export function inferInstallMethod(
    executables: HermesExecutableCandidate[],
    pipInstalled: boolean,
): HermesInstallMethod | undefined {
    if (pipInstalled || executables.some((item) => item.source === 'pip')) {
        return 'pip';
    }
    if (executables.some((item) => item.path.includes('homebrew'))) {
        return 'homebrew';
    }
    if (executables.some((item) => item.source === 'known_path' || item.source === 'hermes_home')) {
        return 'git/native';
    }
    if (executables.length > 0) {
        return 'unknown';
    }
    return undefined;
}

export function buildRecommendation(
    executables: HermesExecutableCandidate[],
    registryPath?: string,
): HermesEnvironmentRecommendation {
    if (executables.length === 0) {
        return { action: 'reinstall' };
    }

    const preferred =
        executables.find((item) => item.verified) ??
        executables[0];
    const pluginPath = preferred.path;
    const systemPathDir = getHermesExecutableDirectory(pluginPath);
    const extensionPath = process.env.PATH || process.env.Path || '';
    const visibleToExtension = isDirectoryOnPath(systemPathDir, extensionPath);
    const visibleToRegistry = registryPath
        ? isDirectoryOnPath(systemPathDir, registryPath)
        : false;

    if (!preferred.verified) {
        return { pluginPath, systemPathDir, action: 'reinstall' };
    }
    if (!visibleToExtension && !visibleToRegistry) {
        return { pluginPath, systemPathDir, action: 'configure_system' };
    }
    if (!visibleToExtension) {
        return { pluginPath, systemPathDir, action: 'configure_plugin' };
    }
    return { pluginPath, systemPathDir, action: 'none' };
}

/** Layered Hermes environment detection (L0–L5 + version verification). */
export async function detectHermesEnvironment(
    configuredPath?: string,
    options?: DetectHermesEnvironmentOptions,
): Promise<HermesEnvironmentReport> {
    const onProgress = options?.onProgress;
    const signal = options?.signal;
    const seen = new Set<string>();
    const rawExecutables: Array<{ path: string; source: HermesDetectSource }> = [];
    const registryPath = refreshWindowsPathFromRegistry();

    const add = async (filePath: string, source: HermesDetectSource): Promise<void> => {
        const key = normalizeExecutableKey(filePath);
        if (seen.has(key)) {
            return;
        }
        if (!(await accessExecutable(filePath))) {
            return;
        }
        seen.add(key);
        rawExecutables.push({ path: path.normalize(filePath), source });
    };

    const completeProbeStep = (step: HermesDetectStepId, before: number): void => {
        const added = rawExecutables.slice(before);
        onProgress?.({
            step,
            status: 'ok',
            paths: added.map((item) => item.path),
            count: added.length,
            detail: added.length > 0 ? added.map((item) => item.path).join('\n') : undefined,
        });
    };

    const runProbeStep = async (step: HermesDetectStepId, probe: () => Promise<void>): Promise<boolean> => {
        const cancelled = cancelledIfAborted(signal);
        if (cancelled) {
            return false;
        }
        onProgress?.({ step, status: 'running' });
        const before = rawExecutables.length;
        await probe();
        const cancelledAfter = cancelledIfAborted(signal);
        if (cancelledAfter) {
            return false;
        }
        completeProbeStep(step, before);
        return true;
    };

    onProgress?.({ step: 'config', status: 'running' });
    if (configuredPath?.trim()) {
        const trimmed = configuredPath.trim();
        if (await accessExecutable(trimmed)) {
            await add(trimmed, 'config');
            onProgress?.({
                step: 'config',
                status: 'ok',
                paths: [trimmed],
                count: 1,
                detail: trimmed,
            });
        } else {
            onProgress?.({
                step: 'config',
                status: 'fail',
                detail: trimmed,
            });
        }
    } else {
        onProgress?.({ step: 'config', status: 'skip' });
    }

    {
        const cancelled = cancelledIfAborted(signal);
        if (cancelled) return cancelled;
    }

    if (!(await runProbeStep('path_lookup', () => probePathLookup(add)))) {
        const cancelled = cancelledIfAborted(signal);
        if (cancelled) return cancelled;
    }
    if (!(await runProbeStep('known_path', () => probeKnownPaths(add)))) {
        const cancelled = cancelledIfAborted(signal);
        if (cancelled) return cancelled;
    }

    onProgress?.({ step: 'pip', status: 'running' });
    const pipBefore = rawExecutables.length;
    const pipProbe = await probePipInstall(add);
    {
        const cancelled = cancelledIfAborted(signal);
        if (cancelled) return cancelled;
    }
    completeProbeStep('pip', pipBefore);

    onProgress?.({ step: 'python_import', status: 'running' });
    const pythonBefore = rawExecutables.length;
    const pythonImportOk = await probePythonImport(add);
    {
        const cancelled = cancelledIfAborted(signal);
        if (cancelled) return cancelled;
    }
    completeProbeStep('python_import', pythonBefore);

    if (!(await runProbeStep('hermes_home', () => probeHermesHomePaths(add)))) {
        const cancelled = cancelledIfAborted(signal);
        if (cancelled) return cancelled;
    }

    onProgress?.({ step: 'verify', status: 'running' });
    const executables: HermesExecutableCandidate[] = [];
    for (const item of rawExecutables) {
        {
            const cancelled = cancelledIfAborted(signal);
            if (cancelled) return cancelled;
        }
        const verification = await verifyExecutable(item.path);
        executables.push({
            path: item.path,
            source: item.source,
            verified: verification.verified,
            version: verification.version,
        });
    }
    const verifiedCount = executables.filter((item) => item.verified).length;
    onProgress?.({
        step: 'verify',
        status: verifiedCount > 0 ? 'ok' : executables.length > 0 ? 'fail' : 'ok',
        verifiedCount,
        totalCount: executables.length,
        count: verifiedCount,
    });

    {
        const cancelled = cancelledIfAborted(signal);
        if (cancelled) return cancelled;
    }

    const preferredExecutable =
        executables.find((item) => item.verified)?.path ??
        executables[0]?.path;
    let acpOk = false;
    let acpVersion: string | undefined;
    let acpInstallAttempted = false;
    let acpDetail: string | undefined;

    if (preferredExecutable && verifiedCount > 0) {
        onProgress?.({ step: 'acp_check', status: 'running' });
        let acpResult = await checkHermesAcp(preferredExecutable);
        {
            const cancelled = cancelledIfAborted(signal);
            if (cancelled) return cancelled;
        }

        if (acpResult.ok) {
            acpOk = true;
            acpVersion = acpResult.version;
            acpDetail = acpResult.output;
            onProgress?.({
                step: 'acp_check',
                status: 'ok',
                detail: acpResult.version
                    ? `${acpResult.output}\n${acpResult.version}`
                    : acpResult.output,
            });
            onProgress?.({ step: 'acp_install', status: 'skip' });
        } else {
            acpDetail = acpResult.output;
            onProgress?.({
                step: 'acp_check',
                status: 'fail',
                detail: acpResult.output || undefined,
            });

            onProgress?.({ step: 'acp_install', status: 'running' });
            acpInstallAttempted = true;
            const installResult = await installAcpDependencies(preferredExecutable);
            {
                const cancelled = cancelledIfAborted(signal);
                if (cancelled) return cancelled;
            }

            if (installResult.ok) {
                onProgress?.({
                    step: 'acp_install',
                    status: 'ok',
                    detail: installResult.detail,
                });
            } else {
                onProgress?.({
                    step: 'acp_install',
                    status: 'fail',
                    detail: installResult.detail,
                });
            }

            onProgress?.({ step: 'acp_check', status: 'running' });
            acpResult = await checkHermesAcp(preferredExecutable);
            {
                const cancelled = cancelledIfAborted(signal);
                if (cancelled) return cancelled;
            }

            if (acpResult.ok) {
                acpOk = true;
                acpVersion = acpResult.version;
                acpDetail = acpResult.output;
                onProgress?.({
                    step: 'acp_check',
                    status: 'ok',
                    detail: acpResult.version
                        ? `${acpResult.output}\n${acpResult.version}`
                        : acpResult.output,
                });
            } else {
                acpDetail = acpResult.output || installResult.detail;
                onProgress?.({
                    step: 'acp_check',
                    status: 'fail',
                    detail: acpDetail,
                });
            }
        }
    } else {
        onProgress?.({ step: 'acp_check', status: 'skip' });
        onProgress?.({ step: 'acp_install', status: 'skip' });
    }

    let status: HermesEnvironmentStatus = 'not_found';
    if (executables.length === 0) {
        status = 'not_found';
    } else if (verifiedCount === 0) {
        status = 'broken';
    } else if (!acpOk) {
        status = 'broken';
    } else {
        status = 'ready';
    }

    const installMethod = inferInstallMethod(executables, pipProbe.pipInstalled);
    const recommendation = buildRecommendation(executables, registryPath);

    onProgress?.({
        step: 'summary',
        status: status === 'ready' ? 'ok' : 'fail',
        reportStatus: status,
        count: executables.length,
        verifiedCount,
    });

    return {
        status,
        executables,
        installMethod,
        diagnostics: {
            extensionPath: process.env.PATH || process.env.Path || '',
            registryPath,
            pipInstalled: pipProbe.pipInstalled,
            pythonImportOk,
            hermesHome: process.env.HERMES_HOME?.trim() || resolveDefaultHermesHome(),
            acpOk,
            acpVersion,
            acpInstallAttempted,
            acpDetail,
        },
        recommendation,
    };
}

async function findVerifiedHermesOnPath(): Promise<string | undefined> {
    const whichCmd = process.platform === 'win32' ? 'where' : 'which';
    const refreshedPath = refreshWindowsPathFromRegistry();
    const env = refreshedPath
        ? { ...process.env, Path: refreshedPath, PATH: refreshedPath }
        : process.env;

    const resolved = await new Promise<string[] | null>((resolve) => {
        const proc = spawn(whichCmd, ['hermes'], {
            stdio: ['ignore', 'pipe', 'ignore'],
            shell: process.platform === 'win32',
            env,
        });
        let stdout = '';
        proc.stdout?.on('data', (chunk: Buffer) => {
            stdout += chunk.toString();
        });
        proc.on('exit', (code) => {
            if (code !== 0) {
                resolve(null);
                return;
            }
            resolve(
                stdout
                    .split(/\r?\n/)
                    .map((line) => line.trim())
                    .filter(Boolean),
            );
        });
        proc.on('error', () => resolve(null));
    });

    if (!resolved) {
        return undefined;
    }
    for (const item of resolved) {
        if (!path.isAbsolute(item) || !(await accessExecutable(item))) {
            continue;
        }
        const verification = await verifyExecutable(item);
        if (verification.verified) {
            return item;
        }
    }
    return undefined;
}

/** Return a verified Hermes path from plugin setting or PATH without running full detection. */
export async function tryResolveHermesQuick(configuredPath?: string): Promise<string | undefined> {
    const trimmed = configuredPath?.trim();
    if (trimmed && (await accessExecutable(trimmed))) {
        const verification = await verifyExecutable(trimmed);
        if (verification.verified) {
            const acp = await checkHermesAcp(trimmed);
            if (acp.ok) {
                return trimmed;
            }
        }
    }
    const pathExecutable = await findVerifiedHermesOnPath();
    if (!pathExecutable) {
        return undefined;
    }
    const acp = await checkHermesAcp(pathExecutable);
    return acp.ok ? pathExecutable : undefined;
}

/** Return executable paths ordered by detection priority. */
export async function scanHermesExecutables(configuredPath?: string): Promise<string[]> {
    const report = await detectHermesEnvironment(configuredPath);
    return report.executables.map((item) => item.path);
}
