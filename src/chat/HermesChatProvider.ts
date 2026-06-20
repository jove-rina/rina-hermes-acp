import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { AcpClient, AcpStatus } from '../acp/AcpClient';

interface ChatMessage {
    role: string;
    text: string;
    timestamp: number;
}

interface SessionInfo {
    id: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    messageCount: number;
}

export class HermesChatProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private _acp?: AcpClient;
    private _output: vscode.OutputChannel;
    private _historyPath: string;
    private _sessionsPath: string;
    private _sessionMessages: ChatMessage[] = [];
    private _sessionId: string = '';
    private _sessions: SessionInfo[] = [];
    private _lastAssistantText: string = '';

    constructor(
        private readonly _extensionUri: vscode.Uri,
        context: vscode.ExtensionContext
    ) {
        this._output = vscode.window.createOutputChannel('Hermes Chat', 'hermes-chat');
        const storagePath = context.globalStorageUri.fsPath;
        fs.mkdirSync(storagePath, { recursive: true });
        this._historyPath = path.join(storagePath, 'chat-history.json');
        this._sessionsPath = path.join(storagePath, 'sessions.json');
        this._sessionId = Date.now().toString(36);
        this._loadSessions();
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
                case 'openFile':
                    this._handleOpenFile(message.path);
                    break;
                case 'newChat':
                    this._handleNewChat();
                    break;
                case 'ready':
                    this._log('WebView ready');
                    this._postMessage({ type: 'sessionList', sessions: this._sessions });
                    this._postMessage({ type: 'agentList', agents: this._getAgentNames() });
                    this._restoreMessages();
                    this._connect();
                    break;
                case 'getSessions':
                    this._postMessage({ type: 'sessionList', sessions: this._sessions });
                    break;
                case 'deleteSession':
                    this._handleDeleteSession(message.sessionId);
                    break;
                case 'switchAgent':
                    this._handleSwitchAgent(message.agentName);
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
            const keep = this._sessionMessages.slice(-100);
            fs.writeFileSync(this._historyPath, JSON.stringify(keep, null, 2));
            this._saveCurrentSession();
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

    private _saveCurrentSession(): void {
        const existing = this._sessions.find(s => s.id === this._sessionId);
        if (existing) {
            existing.updatedAt = Date.now();
            existing.messageCount = this._sessionMessages.length;
        } else {
            this._sessions.unshift({
                id: this._sessionId,
                title: this._sessionMessages.find(m => m.role === 'user')?.text.slice(0, 40) || 'New Chat',
                createdAt: parseInt(this._sessionId, 36) || Date.now(),
                updatedAt: Date.now(),
                messageCount: this._sessionMessages.length,
            });
        }
        try {
            fs.writeFileSync(this._sessionsPath, JSON.stringify(this._sessions.slice(0, 50), null, 2));
        } catch { /* non-critical */ }
    }

    private _loadSessions(): void {
        try {
            if (fs.existsSync(this._sessionsPath)) {
                this._sessions = JSON.parse(fs.readFileSync(this._sessionsPath, 'utf-8'));
            }
        } catch { this._sessions = []; }
    }

    private async _connect(agentName?: string): Promise<void> {
        if (this._acp) return;
        this._log(`Connecting${agentName ? ' as ' + agentName : ''}...`);

        const config = vscode.workspace.getConfiguration('hermes');
        let configPath = config.get<string>('path') || undefined;
        let configCwd = config.get<string>('cwd') || undefined;
        let configProfile = config.get<string>('profile') || undefined;

        if (agentName) {
            const agents = config.get<any[]>('agents') || [];
            const agent = agents.find(a => a.name === agentName);
            if (agent) {
                if (agent.path) configPath = agent.path;
                if (agent.cwd) configCwd = agent.cwd;
                if (agent.profile) configProfile = agent.profile;
            }
        }

        const cwd = this._resolveCwd(configCwd);

        this._acp = new AcpClient(
            (role, text) => {
                this._postMessage({ type: 'addMessage', role, text });
                if (role === 'user') {
                    this._saveMessage('user', text);
                }
                if (role === 'assistant') {
                    this._lastAssistantText = text;
                }
            },
            (status, msg) => {
                this._log(`Status: ${status}${msg ? ' — ' + msg : ''}`);
                this._postMessage({ type: 'status', status, message: msg });
                // Save assistant message once when streaming completes
                if (status === 'ready' && this._lastAssistantText) {
                    this._saveMessage('assistant', this._lastAssistantText);
                    this._lastAssistantText = '';
                }
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
            },
            (cmd: string, cwd: string) => {
                this._log(`Terminal: ${cmd.slice(0, 80)}`);
                const terminal = vscode.window.createTerminal({
                    name: `Hermes: ${cmd.slice(0, 30)}`,
                    cwd,
                });
                terminal.sendText(cmd);
                terminal.show(false);
            }
        );
        try {
            await this._acp.start(cwd, configPath, configProfile);
        } catch {
            this._acp = undefined;
        }
    }

    private _handleUserMessage(text: string): void {
        this._log(`User message: ${text.slice(0, 80)}`);
        this._saveMessage('user', text);
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

    private async _handleOpenFile(filePath: string): Promise<void> {
        this._log(`Open file: ${filePath}`);
        try {
            let uri: vscode.Uri;
            if (path.isAbsolute(filePath)) {
                uri = vscode.Uri.file(filePath);
            } else {
                const folders = vscode.workspace.workspaceFolders;
                if (folders && folders.length > 0) {
                    uri = vscode.Uri.joinPath(folders[0].uri, filePath);
                } else {
                    uri = vscode.Uri.file(filePath);
                }
            }
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
        } catch {
            vscode.window.showWarningMessage(`Could not open file: ${filePath}`);
        }
    }

    private async _handleNewChat(): Promise<void> {
        this._log('New Chat');
        this._saveCurrentSession();
        this._sessionMessages = [];
        this._sessionId = Date.now().toString(36);
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
        this._postMessage({ type: 'sessionList', sessions: this._sessions });
    }

    private async _handleDeleteSession(sessionId: string): Promise<void> {
        this._log(`Delete session: ${sessionId}`);
        this._sessions = this._sessions.filter(s => s.id !== sessionId);
        try {
            fs.writeFileSync(this._sessionsPath, JSON.stringify(this._sessions, null, 2));
        } catch { /* ignore */ }
        this._postMessage({ type: 'sessionList', sessions: this._sessions });
    }

    private async _handleSwitchAgent(agentName: string): Promise<void> {
        this._log(`Switch to agent: ${agentName}`);
        this._saveCurrentSession();
        this._acp?.dispose();
        this._acp = undefined;
        this._sessionMessages = [];
        this._sessionId = Date.now().toString(36);
        try { fs.unlinkSync(this._historyPath); } catch { /* ignore */ }
        this._postMessage({ type: 'newChat' });
        this._postMessage({ type: 'agentList', agents: this._getAgentNames() });
        await this._connect(agentName);
    }

    private _getAgentNames(): string[] {
        const config = vscode.workspace.getConfiguration('hermes');
        const agents = config.get<any[]>('agents') || [];
        return agents.map(a => a.name).filter(Boolean);
    }

    public newChat(): void {
        this._handleNewChat();
    }

    public sendText(text: string): void {
        this._postMessage({ type: 'addMessage', role: 'user', text });
        this._saveMessage('user', text);
        this._acp?.sendMessage(text);
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
        let html = fs.readFileSync(htmlPath, 'utf-8');

        if (this._view) {
            const webview = this._view.webview;
            const vendorUri = (file: string) =>
                webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vendor', file)).toString();
            html = html
                .replace('{{MARKED_URI}}', vendorUri('marked.min.js'))
                .replace('{{HIGHLIGHT_URI}}', vendorUri('highlight.min.js'))
                .replace('{{HIGHLIGHT_CSS_URI}}', vendorUri('github-dark.min.css'));
        }

        return html;
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
