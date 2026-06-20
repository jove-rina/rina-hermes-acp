import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AcpClient, AcpStatus } from '../acp/AcpClient';

interface ChatMessage {
    role: string;
    text: string;
    timestamp: number;
}

export class HermesChatProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _acp?: AcpClient;
    private _output: vscode.OutputChannel;
    private _historyPath: string;
    private _sessionMessages: ChatMessage[] = [];

    constructor(
        private readonly _extensionUri: vscode.Uri
    ) {
        this._output = vscode.window.createOutputChannel('Hermes Chat', 'hermes-chat');
        this._historyPath = path.join(_extensionUri.fsPath, '.chat-history.json');
        this._loadHistory();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtml();

        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.type) {
                case 'sendMessage':
                    this._handleUserMessage(message.text);
                    break;
                case 'cancel':
                    this._acp?.cancel();
                    break;
                case 'insertCode':
                    this._handleInsertCode(message.text);
                    break;
                case 'newChat':
                    this._handleNewChat();
                    break;
                case 'ready':
                    this._log('WebView ready');
                    this._restoreMessages();
                    this._connect();
                    break;
            }
        });

        webviewView.onDidChangeVisibility(() => {
            if (webviewView.visible && !this._acp) {
                this._connect();
            }
        });
    }

    private _log(msg: string): void {
        const time = new Date().toISOString().slice(11, 19);
        this._output.appendLine(`[${time}] ${msg}`);
    }

    private _restoreMessages(): void {
        if (this._sessionMessages.length === 0) return;
        this._log(`Restoring ${this._sessionMessages.length} messages`);
        for (const m of this._sessionMessages) {
            this._postMessage({ type: 'addMessage', role: m.role, text: m.text });
        }
    }

    private _saveMessage(role: string, text: string): void {
        this._sessionMessages.push({ role, text, timestamp: Date.now() });
        try {
            const keep = this._sessionMessages.slice(-100); // keep last 100
            fs.writeFileSync(this._historyPath, JSON.stringify(keep, null, 2));
        } catch {
            // non-critical
        }
    }

    private _loadHistory(): void {
        try {
            if (fs.existsSync(this._historyPath)) {
                const data = fs.readFileSync(this._historyPath, 'utf-8');
                this._sessionMessages = JSON.parse(data);
                this._log(`Loaded ${this._sessionMessages.length} messages from history`);
            }
        } catch {
            this._sessionMessages = [];
        }
    }

    private async _connect(): Promise<void> {
        if (this._acp) return;
        this._log('Connecting...');

        const config = vscode.workspace.getConfiguration('hermes');
        const configPath = config.get<string>('path') || undefined;
        const configCwd = config.get<string>('cwd') || undefined;
        const cwd = this._resolveCwd(configCwd);

        this._acp = new AcpClient(
            (role, text) => {
                this._postMessage({ type: 'addMessage', role, text });
                if (role === 'user' || role === 'assistant') {
                    this._saveMessage(role, text);
                }
            },
            (status, msg) => {
                this._log(`Status: ${status}${msg ? ' — ' + msg : ''}`);
                this._postMessage({ type: 'status', status, message: msg });
            },
            async (prompt) => {
                this._log(`Permission requested: ${prompt.slice(0, 80)}`);
                const result = await vscode.window.showWarningMessage(
                    `Allow Hermes to run: ${prompt}`,
                    { modal: false },
                    'Allow',
                    'Deny'
                );
                return result === 'Allow';
            },
            () => {
                this._log('Connection lost');
                this._acp = undefined;
            },
            {
                readTextFile: async (p: string) => {
                    this._log(`fs.readTextFile: ${p}`);
                    const uri = vscode.Uri.file(p);
                    const bytes = await vscode.workspace.fs.readFile(uri);
                    return new TextDecoder().decode(bytes);
                },
                writeTextFile: async (p: string, content: string) => {
                    this._log(`fs.writeTextFile: ${p} (${content.length} chars)`);
                    const uri = vscode.Uri.file(p);
                    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(content));
                },
            }
        );

        try {
            await this._acp.start(cwd, configPath);
        } catch {
            // start() already set error status and cleaned up — just null the ref
            this._acp = undefined;
        }
    }

    private _handleUserMessage(text: string): void {
        this._log(`User message: ${text.slice(0, 80)}`);
        this._acp?.sendMessage(text);
    }

    private _handleInsertCode(text: string): void {
        this._log(`Insert code (${text.length} chars)`);
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showInformationMessage('No active editor to insert code into.');
            return;
        }
        editor.edit((editBuilder) => {
            editBuilder.insert(editor.selection.active, text);
        });
    }

    private async _handleNewChat(): Promise<void> {
        this._log('New Chat');
        this._sessionMessages = [];
        try { fs.unlinkSync(this._historyPath); } catch { /* ignore */ }

        const config = vscode.workspace.getConfiguration('hermes');
        const configCwd = config.get<string>('cwd') || undefined;
        const cwd = this._resolveCwd(configCwd);

        if (this._acp) {
            await this._acp.newSession(cwd);
        } else {
            await this._connect();
        }
        this._postMessage({ type: 'newChat' });
    }

    public newChat(): void {
        this._handleNewChat();
    }

    public dispose(): void {
        this._acp?.dispose();
        this._acp = undefined;
        this._view = undefined;
        this._output.dispose();
    }

    private _postMessage(msg: any): void {
        this._view?.webview.postMessage(msg);
    }

    private _getHtml(): string {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'chat.html');
        return fs.readFileSync(htmlPath, 'utf-8');
    }

    private _resolveCwd(configCwd?: string): string {
        if (configCwd) return configCwd;
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const folder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
            if (folder) return folder.uri.fsPath;
        }
        const folders = vscode.workspace.workspaceFolders;
        if (folders && folders.length > 0) return folders[0].uri.fsPath;
        return process.cwd();
    }
}
