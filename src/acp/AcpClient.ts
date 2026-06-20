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

export type AcpStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export type MessageHandler = (role: 'user' | 'assistant' | 'tool', text: string) => void;
export type StatusHandler = (status: AcpStatus, message?: string) => void;
export type StreamEndHandler = () => void;
export type PermissionHandler = (prompt: string) => Promise<boolean>;
export type ConnectionLostHandler = () => void;

export class AcpClient {
    private _process: ChildProcess | null = null;
    private _app: ReturnType<typeof client> | null = null;
    private _session: ActiveSession | null = null;
    private _conn: ClientConnection | null = null;
    private _status: AcpStatus = 'disconnected';
    private _onMessage: MessageHandler;
    private _onStatus: StatusHandler;
    private _onStreamEnd: StreamEndHandler;
    private _onPermission: PermissionHandler;
    private _onConnectionLost: ConnectionLostHandler;
    private _responseBuffer: string = '';
    private _thoughtBuffer: string = '';

    constructor(
        onMessage: MessageHandler,
        onStatus: StatusHandler,
        onStreamEnd?: StreamEndHandler,
        onPermission?: PermissionHandler,
        onConnectionLost?: ConnectionLostHandler
    ) {
        this._onMessage = onMessage;
        this._onStatus = onStatus;
        this._onStreamEnd = onStreamEnd || (() => {});
        this._onPermission = onPermission || (async () => true);
        this._onConnectionLost = onConnectionLost || (() => {});
    }

    get status(): AcpStatus {
        return this._status;
    }

    async start(cwd: string = process.cwd(), hermesPath?: string): Promise<void> {
        if (this._status === 'connected' || this._status === 'connecting') {
            return;
        }

        this._setStatus('connecting', 'Starting Hermes ACP...');

        try {
            const resolvedPath = hermesPath || await this._findHermes();
            if (!resolvedPath) throw new Error('Hermes executable not found');

            this._process = spawn(resolvedPath, ['acp'], {
                cwd,
                stdio: ['pipe', 'pipe', 'pipe'],
                env: { ...process.env }
            });

            const childInput = new WritableStream<Uint8Array>({
                write: (chunk) => {
                    this._process?.stdin?.write(Buffer.from(chunk));
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
                this._setStatus('error', `Process error: ${err.message}`);
                this._onConnectionLost();
            });

            this._process.on('exit', (code, signal) => {
                if (this._status !== 'disconnected') {
                    this.stop(); // clean up session, app, and process refs
                    this._setStatus('error', `Process exited (code: ${code}, signal: ${signal})`);
                    this._onConnectionLost();
                }
            });

            this._process.stderr?.on('data', (chunk: Buffer) => {
                console.log('[hermes acp]', chunk.toString());
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
                        // Find the first 'allow' type option
                        const allowOpt = options.find((o: any) =>
                            o.optionId?.startsWith('allow') || o.optionId === 'allow_once');
                        return { outcome: { outcome: 'selected', optionId: allowOpt?.optionId ?? options[0]?.optionId ?? 'allow' } } as any;
                    }
                    // Find a 'reject' type option
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

            // connect() keeps the connection alive (unlike connectWith)
            this._conn = this._app.connect(stream);
            const ctx = this._conn.agent;

            // Explicit initialize with client capabilities
            await ctx.request(methods.agent.initialize, {
                protocolVersion: PROTOCOL_VERSION,
                capabilities: {},
                clientCapabilities: {
                    session: { update: true },
                    fs: { readTextFile: false, writeTextFile: false },
                    terminal: false
                }
            } as any);

            const builder = ctx.buildSession(cwd);
            this._session = await builder.start();
            this._setStatus('connected', `Session: ${this._session.sessionId}`);

        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._setStatus('error', `Connection failed: ${msg}`);
            await this.stop();
            throw err; // rethrow so Provider can null out _acp
        }
    }

    async sendMessage(text: string): Promise<void> {
        if (!this._session) {
            this._onMessage('assistant', 'Not connected. Waiting...');
            this._onStreamEnd(); // re-enable input
            return;
        }

        this._responseBuffer = '';

        try {
            await this._session.prompt(text);
            this._onStreamEnd();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._onMessage('assistant', `Error: ${msg}`);
            this._onStreamEnd();
        }
    }

    async cancel(): Promise<void> {
        if (!this._session || !this._conn) return;
        try {
            await this._conn.agent.notify(methods.agent.session.cancel, {
                sessionId: this._session.sessionId
            });
            this._responseBuffer = '';
            this._thoughtBuffer = '';
            this._onStreamEnd();
        } catch {
            // cancel is best-effort
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
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._setStatus('error', `New session failed: ${msg}`);
        }
    }

    async stop(): Promise<void> {
        try {
            this._session?.dispose();
        } catch { /* ignore */ }
        this._session = null;
        this._conn = null;
        this._app = null;

        if (this._process) {
            this._process.kill();
            this._process = null;
        }

        this._setStatus('disconnected');
    }

    dispose(): void {
        this.stop();
    }

    private _handleSessionUpdate(notification: any): void {
        const update = notification.update;
        const kind = update.sessionUpdate;

        switch (kind) {
            case 'agent_message_chunk': {
                const content = update.content;
                const text = content?.text || content?.content?.text || '';
                if (text) {
                    this._responseBuffer += text;
                    this._onMessage('assistant', this._responseBuffer);
                }
                break;
            }

            case 'agent_thought_chunk': {
                // Accumulate thoughts in their own buffer
                const thought = update.content;
                const thoughtText = thought?.text || thought?.content?.text || '';
                if (thoughtText) {
                    this._thoughtBuffer += thoughtText;
                    this._onMessage('tool', `💭 ${this._thoughtBuffer}`);
                }
                break;
            }

            case 'tool_call':
                this._onMessage('tool', `🔧 ${update.title}`);
                break;

            case 'tool_call_update':
                this._onMessage('tool', `⚙️ ${update.title ?? 'Tool running'}`);
                break;
        }
    }

    private async _findHermes(): Promise<string> {
        // Check if 'hermes' is on PATH via fs.access on common locations
        const candidates = [
            'hermes',  // will be resolved via PATH by spawn
            path.join(os.homedir(), '.hermes', 'hermes-agent', 'venv', 'bin', 'hermes'),
            '/usr/local/bin/hermes',
            '/opt/homebrew/bin/hermes',
        ];

        for (const cmd of candidates) {
            try {
                if (path.isAbsolute(cmd)) {
                    await fs.promises.access(cmd, fs.constants.X_OK);
                    return cmd;
                }
                // For non-absolute path, try which as fallback
                const found = await new Promise<boolean>((resolve) => {
                    const proc = spawn('which', [cmd], { stdio: 'ignore' });
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

    private _setStatus(status: AcpStatus, message?: string): void {
        this._status = status;
        this._onStatus(status, message);
    }
}
