import { LocaleStrings } from '../types';

export const en: LocaleStrings = {
    selectCodeFirst: 'Select some code first.',
    allowHermesRun: 'Allow Hermes to run: {0}',
    allow: 'Allow',
    deny: 'Deny',
    waitForResponse: 'Wait for the current response before changing model.',
    failedSwitchModel: 'Failed to switch model: {0}',
    savedModelUnavailable: 'Saved model "{0}" is no longer available.',
    modelPreferenceSaved: 'Model preference saved locally. Configure Hermes models or hermes.models in Settings.',
    hermesNotConnected: 'Hermes is not connected.',
    couldNotOpenFile: 'Could not open file: {0}',
    hermesNotConnectedConnecting: 'Hermes is not connected. Connecting...',
    fileAccessDenied: 'Cannot access this file',
    fileReadError: 'Cannot read file',
    newChat: 'New Chat',
    defaultAgent: 'Default',
    statusStartingAcp: 'Starting Hermes ACP...',
    statusHermesThinking: 'Hermes is thinking...',
    statusProcessError: 'Process error: {0}',
    statusProcessExited: 'Process exited (code: {0}, signal: {1})',
    statusConnectionFailed: 'Connection failed: {0}',
    statusNewSessionFailed: 'New session failed: {0}',

    connectionStatus: 'Connection status',
    statusDisconnected: 'Disconnected',
    statusConnecting: 'Connecting...',
    statusReady: 'Ready',
    statusThinking: 'Thinking...',
    statusError: 'Error',
    retry: 'Retry',
    switchProfile: 'Switch Hermes profile',
    profile: 'Profile',
    profiles: 'Profiles',
    switchModel: 'Switch model',
    model: 'Model',
    models: 'Models',
    newChatBtn: '+ New',
    moreOptions: 'More options',
    menuAbout: 'About',
    menuSettings: 'Settings',
    menuHelp: 'Help',
    menuLogs: 'Logs',

    connectingTitle: 'Connecting to Hermes Agent...',
    connectingHint: 'Make sure Hermes is installed and accessible',
    readyPlaceholder: 'Ready. Start a new conversation.',
    connectionError: 'Connection error.',
    retryConnect: 'Reconnect',

    inputPlaceholder: 'Message Hermes... (type @ to reference a file)',
    resizeHandle: 'Drag to resize input area',
    filePicker: 'File picker',
    searchChat: 'Search current conversation…',
    searchPrev: 'Previous match (↑)',
    searchNext: 'Next match (↓)',
    clearChat: 'Clear current conversation',
    clearInput: 'Clear input',
    copySession: 'Copy current session',
    quickActions: 'Quick actions',
    quickActionsExpand: 'Expand quick actions',
    quickActionsCollapse: 'Collapse quick actions',
    tokenUsage: 'Input token usage',
    send: 'Send',
    stop: 'Stop',
    cancelResponse: 'Stop response',

    hermesLogs: 'Hermes Logs',
    copy: 'Copy',
    clear: 'Clear',
    noLogs: '(no logs yet)',
    aboutTitle: 'About Rina Hermes ACP',
    helpTitle: 'Help — How to start ACP',

    aboutVersion: 'Version',
    aboutDescription: 'Chat with the local <strong>Hermes Agent</strong> directly in the VS Code sidebar. The extension starts a <code>hermes acp</code> subprocess via the ACP protocol, with streaming replies, multi-session tabs, model switching, and terminal integration.',
    aboutFeatureTabs: 'Multi-session tab management',
    aboutFeaturePickers: 'Profile / Model selectors',
    aboutFeatureInsert: 'Copy/insert code blocks and tables (chat input or editor)',
    aboutFeatureTools: 'Tool calls and thinking process (configurable)',
    repository: 'Repository',

    helpHtml: `
            <h3>What is ACP?</h3>
            <p>This extension talks to the local Hermes agent via the <strong>Agent Client Protocol (ACP)</strong>. It automatically starts a <code>hermes acp</code> subprocess — no manual terminal needed.</p>

            <h3>1. Install Hermes</h3>
            <pre><code>curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash</code></pre>
            <p class="dim">After install, Hermes is usually at <code>~/.hermes/hermes-agent/venv/bin/hermes</code>, or already on your PATH.</p>

            <h3>2. Verify ACP starts</h3>
            <p>Test manually in a terminal (on success it waits for stdin; press Ctrl+C to exit):</p>
            <pre><code># default profile
hermes acp

# named profile
hermes --profile &lt;name&gt; acp</code></pre>

            <h3>3. Extension settings</h3>
            <ul>
                <li><code>hermes.path</code> — path to the Hermes executable (empty = auto-detect)</li>
                <li><code>hermes.profile</code> — maps to <code>--profile</code></li>
                <li><code>hermes.cwd</code> — agent working directory (defaults to workspace root)</li>
            </ul>
            <p>Open <strong>More → Settings</strong> from the view title bar; connection-related changes <strong>take effect immediately</strong> (reconnects automatically).</p>

            <h3>4. Troubleshooting connection</h3>
            <ul>
                <li>Confirm <code>hermes acp</code> starts in a terminal</li>
                <li>Set the correct <code>hermes.path</code> in Settings</li>
                <li>Open <strong>More → Logs</strong> from the view title bar to inspect ERROR/WARNING logs</li>
            </ul>`,

    roleYou: 'You',
    roleHermes: 'Hermes',
    roleThought: 'Thought',
    roleTool: 'Tool',
    roleMessage: 'Message',
    permissionTitle: 'Permission required',
    permissionCancelled: 'Cancelled',
    permissionAllowOnce: 'Allow once',
    permissionAllowAlways: 'Always allow',
    permissionAllowSession: 'Allow for session',
    permissionRejectOnce: 'Reject once',
    permissionRejectAlways: 'Always deny',
    permissionDeny: 'Deny',
    permissionExpand: 'Expand',
    permissionCollapse: 'Collapse',
    permissionShowMore: 'Show more',
    permissionCardCollapse: 'Collapse details',
    permissionCardExpand: 'Expand details',
    permissionSelected: 'Selected: {0}',
    insert: 'Insert',
    emptyFile: '(empty file)',
    noMatchingFiles: 'No matching files',
    searchingFiles: 'Searching files…',
    configureAgents: 'Configure hermes.agents in Settings',
    noModels: 'No models — check Hermes profile or hermes.models',
    modelFromAgent: 'Model from Hermes profile',
    modelLocalPreference: 'Local model preference (Settings fallback)',
    tokenUsageLabel: 'Input TOKEN: {0} / {1} ({2}%)',
    copied: 'Copied',
    clickToInsert: 'Click to insert into input',
    insertToInput: 'Insert into chat input',
    insertToEditor: 'Insert into editor',
    insertMenu: 'Insert',
    noActiveEditor: 'Open an editor first',
    selectMessages: 'Select',
    multiSelectAll: 'Select all',
    multiSelectDelete: 'Delete',
    multiSelectCopy: 'Copy',
    multiSelectExport: 'Export',
    multiSelectExit: 'Exit',
    multiSelectCount: '{0} selected',
    fileLinkTitle: 'Click to open · hover to preview',
    tabRename: 'Rename',
    tabClose: 'Close',
    tabContextSid: 'SID',
    tabContextExport: 'Export',
    tabContextCopy: 'Copy',
    tabContextRename: 'Rename',
    tabContextClose: 'Close',
    tabContextCloseOthers: 'Close Others',
    tabContextCloseLeft: 'Close to the Left',
    tabContextCloseRight: 'Close to the Right',
    tabContextCloseAll: 'Close All',
    tabContextPin: 'Pin',
    tabContextUnpin: 'Unpin',
    copySid: 'Copy session ID',
    sessionExportSessionId: 'Session ID: {0}',
    sessionExportModel: 'Model: {0}',
    sessionExportDate: 'Date: {0}',
    sessionRendering: 'Rendering messages…',
    localHistoryDivider: 'Local chat history only',
    localHistoryDividerTitle: 'Agent context was reset; new messages will not include the conversation above',
    localHistoryBadge: 'Local',
};
