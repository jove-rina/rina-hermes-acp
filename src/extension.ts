import * as vscode from 'vscode';
import { HermesChatProvider } from './chat/HermesChatProvider';
import { initI18n, t } from './i18n';

let chatProvider: HermesChatProvider | undefined;

export function activate(context: vscode.ExtensionContext) {
    initI18n();
    console.log('Hermes AI Chat activating...');

    // Register the chat webview provider
    chatProvider = new HermesChatProvider(context.extensionUri, context);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('hermesChat', chatProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('hermes.newChat', () => {
            chatProvider?.newChat();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('hermes.openChat', () => {
            vscode.commands.executeCommand('workbench.view.extension.hermes-sidebar');
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('hermes.sendSelection', () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor || editor.selection.isEmpty) {
                vscode.window.showInformationMessage(t('selectCodeFirst'));
                return;
            }
            const selection = editor.document.getText(editor.selection);
            const fileName = editor.document.fileName;
            const line = editor.selection.start.line + 1;
            const text = `At ${fileName}:${line}\n\`\`\`\n${selection}\n\`\`\``;

            vscode.commands.executeCommand('workbench.view.extension.hermes-sidebar');
            chatProvider?.insertIntoInput(text);
        })
    );

    console.log('Hermes AI Chat activated');
}

export function deactivate() {
    chatProvider?.dispose();
}
