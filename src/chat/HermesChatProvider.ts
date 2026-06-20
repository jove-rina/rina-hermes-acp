import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AcpClient, AcpStatus } from '../acp/AcpClient';

export class HermesChatProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _acp?: AcpClient;

    constructor(
        private readonly _extensionUri: vscode.Uri
    ) { }

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

        // Messages from WebView
        webviewView.webview.onDidReceiveMessage((message) => {
            switch (message.type) {
                case 'sendMessage':
                    this._handleUserMessage(message.text);
                    break;
                case 'cancel':
                    this._acp?.cancel();
                    break;
                case 'newChat':
                    this._handleNewChat();
                    break;
                case 'ready':
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

    private async _connect(): Promise<void> {
        if (this._acp) return;

        const config = vscode.workspace.getConfiguration('hermes');
        const configPath = config.get<string>('path') || undefined;
        const configCwd = config.get<string>('cwd') || undefined;

        const workspaceFolders = vscode.workspace.workspaceFolders;
        const cwd = configCwd || workspaceFolders?.[0]?.uri.fsPath || process.cwd();

        this._acp = new AcpClient(
            (role, text) => this._postMessage({ type: 'addMessage', role, text }),
            (status, msg) => this._postMessage({ type: 'status', status, message: msg }),
            () => this._postMessage({ type: 'streamEnd' }),
            async (prompt) => {
                const result = await vscode.window.showWarningMessage(
                    `Allow Hermes to run: ${prompt}`,
                    { modal: false },
                    'Allow',
                    'Deny'
                );
                return result === 'Allow';
            },
            () => { this._acp = undefined; }
        );

        try {
            await this._acp.start(cwd, configPath);
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            this._postMessage({ type: 'status', status: 'error', message: msg });
            this._acp = undefined;  // Allow retry
        }
    }

    private _handleUserMessage(text: string): void {
        // User message already added by frontend JS — don't post duplicate
        this._acp?.sendMessage(text);
    }

    private async _handleNewChat(): Promise<void> {
        const config = vscode.workspace.getConfiguration('hermes');
        const configCwd = config.get<string>('cwd') || undefined;
        const workspaceFolders = vscode.workspace.workspaceFolders;
        const cwd = configCwd || workspaceFolders?.[0]?.uri.fsPath || process.cwd();

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
    }

    private _postMessage(msg: any): void {
        this._view?.webview.postMessage(msg);
    }

    private _getHtml(): string {
        const htmlPath = path.join(this._extensionUri.fsPath, 'media', 'chat.html');
        return fs.readFileSync(htmlPath, 'utf-8');
    }
}
