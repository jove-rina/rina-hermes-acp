import * as vscode from 'vscode';
import { HermesChatProvider } from './chat/HermesChatProvider';
import { initI18n, t } from './i18n';

let chatProvider: HermesChatProvider | undefined;

function bindChatCommand(
    context: vscode.ExtensionContext,
    command: string,
    run: (provider: HermesChatProvider) => void | Promise<void>
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand(command, () => {
            if (!chatProvider) {
                return;
            }
            void run(chatProvider);
        })
    );
}

export function activate(context: vscode.ExtensionContext) {
    initI18n();
    console.log('Rina Hermes ACP activating...');

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

    bindChatCommand(context, 'hermes.reloadExtension', provider => provider.reloadExtension());
    bindChatCommand(context, 'hermes.reloadSession', provider => provider.reloadSession());
    bindChatCommand(context, 'hermes.openSettings', provider => provider.openSettings());
    bindChatCommand(context, 'hermes.checkUpdate', provider => provider.checkForUpdate());
    bindChatCommand(context, 'hermes.openAbout', provider => provider.openAbout());
    bindChatCommand(context, 'hermes.openHelp', provider => provider.openHelp());
    bindChatCommand(context, 'hermes.openLogs', provider => provider.openLogs());

    console.log('Rina Hermes ACP activated');
}

export function deactivate() {
    chatProvider?.dispose();
}
