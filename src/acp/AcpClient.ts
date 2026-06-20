import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import {
    client,
    ndJsonStream,
    ActiveSession,
    methods
} from '@agentclientprotocol/sdk';
import type {
    ClientConnection
} from '@agentclientprotocol/sdk';
import { PROTOCOL_VERSION } from '@agentclientprotocol/sdk';
import {
    buildModelListState,
    type ModelListState
} from './modelConfig';

export type AcpStatus = 'idle' | 'connecting' | 'ready' | 'prompting' | 'error';
export type { ModelListState } from './modelConfig';
export type ModelsChangedHandler = (models: ModelListState | null) => void;

export type MessageHandler = (role: 'user' | 'assistant' | 'tool' | 'thought', text: string, toolCallId?: string) => void;
export type StatusHandler = (status: AcpStatus, message?: string) => void;
export type PermissionHandler = (prompt: string) => Promise<boolean>;
export type ConnectionLostHandler = () => void;
export type FileSystemHandler = {
    readTextFile: (path: string) => Promise<string>;
    writeTextFile: (path: string, content: string) => Promise<void>;
};
export type TerminalHandler = (command: string, args: string[], cwd: string) => void;
export type LogHandler = (text: string) => void;

interface TerminalInstance {
    process: ChildProcess;
    stdout: string;
    stderr: string;
    exitCode: number | null;
    exitSignal: string | null;
    exited: Promise<void>;
    resolveExit: () => void;
}

export class AcpClient {
    private _process: ChildProcess | null = null;
    private _app: ReturnType<typeof client> | null = null;
    private _session: ActiveSession | null = null;
    private _conn: ClientConnection | null = null;
    private _status: AcpStatus = 'idle';
    private _onMessage: MessageHandler;
    private _onStatus: StatusHandler;
    private _onPermission: PermissionHandler;
    private _onConnectionLost: ConnectionLostHandler;
    private _onFileSystem: FileSystemHandler;
    private _onTerminal: TerminalHandler;
    private _onLog: LogHandler;
    private _terminals: Map<string, TerminalInstance> = new Map();
    private _nextTerminalId: number = 1;
    private _responseBuffer: string = '';
    private _thoughtBuffer: string = '';
    private _configOptions: unknown[] = [];
    private _onModelsChanged: ModelsChangedHandler;

    private static readonly VALID: Record<AcpStatus, AcpStatus[]> = {
        idle:        ['connecting'],
        connecting:  ['ready', 'error'],
        ready:       ['prompting', 'error', 'idle'],
        prompting:   ['ready', 'error', 'idle'],
        error:       ['connecting', 'idle'],
    };

    static canTransitionTo(from: AcpStatus, to: AcpStatus): boolean {
        return AcpClient.VALID[from]?.includes(to) ?? false;
    }

    constructor(
        onMessage: MessageHandler,
        onStatus: StatusHandler,
        onPermission?: PermissionHandler,
        onConnectionLost?: ConnectionLostHandler,
        onFileSystem?: FileSystemHandler,
        onTerminal?: TerminalHandler,
        onModelsChanged?: ModelsChangedHandler
    ) {
        this._onMessage = onMessage;
        this._onStatus = onStatus;
        this._onPermission = onPermission || (async () => true);
        this._onConnectionLost = onConnectionLost || (() => {});
        this._onFileSystem = onFileSystem || { readTextFile: async () => '', writeTextFile: async () => {} };
        this._onTerminal = onTerminal || (() => {});
        this._onLog = () => {};
        this._onModelsChanged = onModelsChanged || (() => {});
    }

    set onLog(handler: LogHandler) { this._onLog = handler; }

    getModelListState(): ModelListState | null {
        return buildModelListState(this._configOptions);
    }

    get status(): AcpStatus {
        return this._status;
    }

    async start(cwd: string = process.cwd(), hermesPath?: string, hermesProfile?: string): Promise<void> {
        if (!this._transitionTo('connecting', 'Starting Hermes ACP...')) {
            return;
        }

        try {
            const resolvedPath = hermesPath || await this._findHermes();
            if (!resolvedPath) throw new Error('Hermes executable not found');

            const args = ['acp'];
            if (hermesProfile) {
                args.unshift('--profile', hermesProfile);
            }

            this._process = spawn(resolvedPath, args, {
                cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env }
            });

            const childInput = new WritableStream<Uint8Array>({
                write: async (chunk) => {
                    const canContinue = this._process?.stdin?.write(Buffer.from(chunk));
                    if (canContinue === false) {
                        // Backpressure: wait for drain before writing more
                        await new Promise<void>((resolve) => {
                            this._process?.stdin?.once('drain', () => resolve());
                        });
                    }
                },
                close: () => {
                    this._process?.stdin?.end();
                }
            });

            const childOutput = new ReadableStream<Uint8Array>({
                start: (controller) => {
                    const stdout = this._process?.stdout;
                    if (stdout) {
                        stdout.on('data', (chunk: Buffer) => {
                            controller.enqueue(new Uint8Array(chunk));
                        });
                        stdout.on('end', () => controller.close());
                        stdout.on('error', (err) => controller.error(err));
                    }
                }
            });

            const stream = ndJsonStream(childInput, childOutput);

            this._process.on('error', (err) => {
                this._transitionTo('error', `Process error: ${err.message}`);
                this._onConnectionLost();
            });

            this._process.on('exit', (code, signal) => {
                if (this._status !== 'idle') {
                    // Manual cleanup: don't call stop() which would override error status
                    this._session?.dispose();
                    this._session = null;
                    this._conn = null;
                    this._app = null;
                    this._process = null;
                    // Kill terminal children
                    for (const [, t] of this._terminals) {
                        try { t.process.kill(); } catch { /* ignore */ }
                    }
                    this._terminals.clear();
                    this._transitionTo('error', `Process exited (code: ${code}, signal: ${signal})`);
                    this._onConnectionLost();
                }
            });

            this._process.stderr?.on('data', (chunk: Buffer) => {
                const line = chunk.toString().trim();
                if (line) {
                    this._onLog(line);
                }
            });

            this._app = client({ name: 'hermes-vscode' });

            this._app.onRequest('session/request_permission', async ({ params }) => {
                const p = params as any;
                const toolCall = p.toolCall;
                const title = toolCall?.title || p.description || p.message || 'Unknown operation';
                const options = p.options || [];
                if (options.length > 0) {
                    const approved = await this._onPermission(title);
                    if (approved) {
                        const allowOpt = options.find((o: any) =>
                            o.optionId?.startsWith('allow') || o.optionId === 'allow_once');
                        return { outcome: { outcome: 'selected', optionId: allowOpt?.optionId ?? options[0]?.optionId ?? 'allow' } } as any;
                    }
                    const rejectOpt = options.find((o: any) =>
                        o.optionId?.startsWith('reject') || o.optionId === 'deny');
                    if (rejectOpt) {
                        return { outcome: { outcome: 'selected', optionId: rejectOpt.optionId } } as any;
                    }
                    return { outcome: { outcome: 'cancelled' } } as any;
                }
                return { outcome: { outcome: 'cancelled' } } as any;
            });

            this._app.onNotification('session/update', async ({ params }) => {
                this._handleSessionUpdate(params);
            });

            // Register fs capability handlers
            this._app.onRequest(methods.client.fs.readTextFile as any, async ({ params }: any) => {
                const content = await this._onFileSystem.readTextFile(params.path);
                return { content };
            });

            this._app.onRequest(methods.client.fs.writeTextFile as any, async ({ params }: any) => {
                await this._onFileSystem.writeTextFile(params.path, params.content);
                return {};
            });

            // Register terminal capability handlers
            this._app.onRequest(methods.client.terminal.create as any, async ({ params }: any) => {
                return this._handleTerminalCreate(params);
            });
            this._app.onRequest(methods.client.terminal.output as any, async ({ params }: any) => {
                return this._handleTerminalOutput(params);
            });
            this._app.onRequest(methods.client.terminal.waitForExit as any, async ({ params }: any) => {
                return this._handleTerminalWaitForExit(params);
            });
            this._app.onRequest(methods.client.terminal.release as any, async ({ params }: any) => {
                return this._handleTerminalRelease(params);
            });
            this._app.onRequest(methods.client.terminal.kill as any, async ({ params }: any) => {
                return this._handleTerminalKill(params);
            });

            this._conn = this._app.connect(stream);
            const ctx = this._conn.agent;

            await ctx.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                clientCapabilities: {
                    fs: { readTextFile: true, writeTextFile: true },
                    terminal: true
                }
            } as any);
            // Note: `as any` is needed because ClientContext.request() type
            // doesn't include the fs/terminal capability fields in its schema type.
            // When ACP SDK schema updates, this cast can be removed.

            const builder = ctx.buildSession(cwd);
            this._session = await builder.start();
            this._syncConfigOptions(this._session.newSessionResponse.configOptions);
            this._transitionTo('ready', `Session: ${this._session.sessionId}`);

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._transitionTo('error', `Connection failed: ${msg}`);
            this.stop();
            throw err;
        }
    }

    async sendMessage(text: string): Promise<void> {
        if (this._status !== 'ready') {
            this._onMessage('assistant', 'Please wait for connection...');
            return;
        }

        this._responseBuffer = '';
        this._thoughtBuffer = '';
        this._transitionTo('prompting', 'Hermes is thinking...');

        try {
            await this._session!.prompt(text);
            this._transitionTo('ready');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._onMessage('assistant', `Error: ${msg}`);
            this._transitionTo('ready');
        }
    }

    async cancel(): Promise<void> {
        if (this._status !== 'prompting' || !this._session || !this._conn) return;
        try {
            await this._conn.agent.notify(methods.agent.session.cancel, {
                sessionId: this._session.sessionId
            });
            this._responseBuffer = '';
            this._thoughtBuffer = '';
            this._transitionTo('ready');
        } catch {
            // best-effort
        }
    }

    async setModel(configId: string, valueId: string): Promise<void> {
        if (!this._session || !this._conn) {
            throw new Error('Not connected');
        }
        if (this._status === 'prompting') {
            throw new Error('Cannot change model while Hermes is responding');
        }

        const response = await this._conn.agent.request(methods.agent.session.setConfigOption, {
            sessionId: this._session.sessionId,
            configId,
            value: valueId,
        } as any);

        const updated = (response as { configOptions?: unknown[] } | void)?.configOptions;
        if (updated) {
            this._syncConfigOptions(updated);
        }
    }

    async newSession(cwd: string): Promise<void> {
        if (!this._conn) {
            await this.start(cwd);
            return;
        }
        try {
            this._session?.dispose();
            this._responseBuffer = '';
            this._thoughtBuffer = '';
            const builder = this._conn.agent.buildSession(cwd);
            this._session = await builder.start();
            this._syncConfigOptions(this._session.newSessionResponse.configOptions);
            this._transitionTo('ready');
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._transitionTo('error', `New session failed: ${msg}`);
            this._onConnectionLost();
        }
    }

    stop(): void {
        try {
            this._session?.dispose();
        } catch { /* ignore */ }
        // Kill all terminal child processes
        for (const [, term] of this._terminals) {
            try { term.process.kill(); } catch { /* ignore */ }
        }
        this._terminals.clear();
        this._session = null;
        this._conn = null;
        this._app = null;

        if (this._process) {
            this._process.kill();
            this._process = null;
        }

        this._transitionTo('idle');
    }

    dispose(): void {
        this.stop();
    }

    // ---- Terminal handlers ----

    private _handleTerminalCreate(params: any): any {
        const id = `term_${this._nextTerminalId++}`;
        const cmd = params.command;
        const args = params.args || [];
        const cwd = params.cwd || process.cwd();
        const env = params.env ? { ...process.env, ...params.env } : process.env;

        this._onTerminal(cmd, args, cwd); // mirror to VS Code terminal

        let resolveExit: () => void = () => {};
        const exited = new Promise<void>((r) => { resolveExit = r; });

        const proc = spawn(cmd, args, {
            cwd,
            shell: args.length === 0,
            env,
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        const term: TerminalInstance = {
            process: proc,
            stdout: '',
            stderr: '',
            exitCode: null,
            exitSignal: null,
            exited,
            resolveExit,
        };

        proc.stdout?.on('data', (chunk: Buffer) => {
            term.stdout += chunk.toString();
        });
        proc.stderr?.on('data', (chunk: Buffer) => {
            term.stderr += chunk.toString();
        });
        proc.on('exit', (code, sig) => {
            term.exitCode = code;
            term.exitSignal = sig === null ? null : sig;
            resolveExit();
        });

        this._terminals.set(id, term);
        return { terminalId: id };
    }

    private _handleTerminalOutput(params: any): any {
        const term = this._terminals.get(params.terminalId);
        if (!term) return { output: '', truncated: false, exitStatus: {} };
        return {
            output: (term.stdout + '\n' + term.stderr).replace(/^\n/, ''),
            truncated: false,
            exitStatus: term.exitCode !== null ? { exitCode: term.exitCode } : undefined,
        };
    }

    private async _handleTerminalWaitForExit(params: any): Promise<any> {
        const term = this._terminals.get(params.terminalId);
        if (!term) return { signal: undefined, exitCode: undefined };
        await term.exited;
        return { exitCode: term.exitCode, signal: term.exitSignal };
    }

    private _handleTerminalRelease(params: any): any {
        const term = this._terminals.get(params.terminalId);
        if (term) {
            term.process.kill();
            this._terminals.delete(params.terminalId);
        }
    }

    private _handleTerminalKill(params: any): any {
        const term = this._terminals.get(params.terminalId);
        if (term) {
            term.process.kill();
        }
    }

    // ---- ACP session update handler ----

    private _handleSessionUpdate(notification: any): void {
        const update = notification.update;
        const kind = update.sessionUpdate;

        switch (kind) {
            case 'agent_message_chunk': {
                // Accumulate incremental text chunks into buffer.
                // Assumption: ACP sends INCREMENTAL text per chunk (spec-compliant).
                // If an agent sends the FULL text each time instead, this will
                // double-append. The SDK's readText() uses the same += pattern.
                const content = update.content;
                const text = content?.text || content?.content?.text || '';
                if (text) {
                    this._responseBuffer += text;
                    this._onMessage('assistant', this._responseBuffer);
                }
                break;
            }

            case 'agent_thought_chunk': {
                const thought = update.content;
                const thoughtText = thought?.text || thought?.content?.text || '';
                if (thoughtText) {
                    this._thoughtBuffer += thoughtText;
                    this._onMessage('thought', this._thoughtBuffer);
                }
                break;
            }

            case 'tool_call':
                this._onMessage('tool', `🔧 ${update.title}`, update.toolCallId);
                break;

            case 'tool_call_update':
                this._onMessage('tool', `⚙️ ${update.title ?? 'Tool running'}`, update.toolCallId);
                break;

            case 'config_option_update': {
                const configOptions = update.configOptions ?? notification.configOptions;
                if (configOptions) {
                    this._syncConfigOptions(configOptions);
                }
                break;
            }
        }
    }

    private _syncConfigOptions(configOptions: unknown): void {
        this._configOptions = Array.isArray(configOptions) ? configOptions : [];
        this._onModelsChanged(buildModelListState(this._configOptions));
    }

    private async _findHermes(): Promise<string> {
        const candidates = [
            'hermes',
            path.join(os.homedir(), '.hermes', 'hermes-agent', 'venv', 'bin', 'hermes'),
            '/usr/local/bin/hermes',
            '/opt/homebrew/bin/hermes',
        ];

        const whichCmd = process.platform === 'win32' ? 'where' : 'which';

        for (const cmd of candidates) {
            try {
                if (path.isAbsolute(cmd)) {
                    await fs.promises.access(cmd, fs.constants.X_OK);
                    return cmd;
                }
                const found = await new Promise<boolean>((resolve) => {
                    const proc = spawn(whichCmd, [cmd], { stdio: 'ignore' });
                    proc.on('exit', (code) => resolve(code === 0));
                    proc.on('error', () => resolve(false));
                });
                if (found) return cmd;
            } catch {
                continue;
            }
        }

        throw new Error(
            'Hermes not found. Install:\n' +
            '  curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash'
        );
    }

    private _transitionTo(status: AcpStatus, message?: string): boolean {
        const allowed = AcpClient.VALID[this._status];
        if (!allowed || !allowed.includes(status)) {
            return false;
        }
        this._status = status;
        this._onStatus(status, message);
        return true;
    }
}
