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
    modelPlaceholder: 'Select model',
    newChatBtn: '+ New',
    moreOptions: 'More options',
    menuAbout: 'About',
    menuSettings: 'Settings',
    menuHelp: 'Help',
    menuFaq: 'FAQ',
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
    faqTitle: 'FAQ',

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

    faqHtml: `
            <h3>1. Why does switching model/session "reset" the conversation?</h3>
            <p><strong>Your chat history is not lost</strong> — only the Hermes Agent's <strong>in-memory context</strong> is cleared.</p>
            <p>Over ACP, the underlying agent maintains one conversation context at a time. These actions trigger <code>newSession</code> and clear agent memory:</p>
            <ul>
                <li><strong>Switching model</strong> — requires a new ACP session for the new model</li>
                <li><strong>Switching tabs (sessions)</strong> — each tab may use a different model; switching back rebinds the agent to that tab's model and state</li>
            </ul>
            <p>You will see the <strong>"Prior session memory above — not carried into the new session"</strong> divider: messages above are restored from disk for <strong>viewing only</strong>; the agent does not remember them. New messages below the divider <strong>do not automatically include</strong> the conversation above as context.</p>
            <p>This is an architectural limitation of Hermes ACP, <strong>not a bug</strong>.</p>
            <p><strong>How to continue a prior discussion?</strong> After a reset, the input area may show <strong>"Session reset? Attach prior session memory?"</strong> You can attach selected prior messages as reference text to your next send (uses more input tokens). Only <strong>user, assistant, and permission</strong> messages count as attachable memory; thought and tool messages are excluded.</p>
            <ul>
                <li>Default: shown once after reset, <strong>disappears after the first successful reply</strong></li>
                <li>Adjust in Settings via <code>hermes.contextAttachVisibility</code>: <code>onNewSession</code> (default) / <code>always</code> / <code>never</code></li>
            </ul>
            <p class="dim"><strong>Tip:</strong> stay in one tab for continuous context; use memory attach after switching; copy or export important conclusions.</p>

            <h3>2. What happens to the model when I switch sessions?</h3>
            <p>Each tab <strong>remembers its own</strong> model choice. After you switch model in a tab, it is saved to that session's metadata and restored when you return.</p>
            <ul>
                <li><strong>New tab</strong>: if no model was chosen yet, inherits the most recently used model under the current Profile</li>
                <li><strong>Switch tab</strong>: restores that tab's model and resets agent context (see above)</li>
                <li><strong>Model no longer available</strong>: warning "Saved model … is no longer available" — pick a new one manually</li>
                <li><strong>While generating</strong>: cannot switch model; switching tabs may interrupt an in-flight reply on another tab</li>
            </ul>

            <h3>3. What changes when I switch Profile?</h3>
            <p>Switching Profile <strong>reconnects the Hermes subprocess</strong> (like restarting <code>hermes --profile &lt;name&gt; acp</code>).</p>
            <ul>
                <li><strong>Different session list</strong> — each Profile / named agent in <code>hermes.agents</code> has separate local storage; tab history, active tab, and model preferences do not carry over</li>
                <li><strong>Model list refreshes</strong> — from models exposed by Hermes under the new Profile; may differ completely</li>
                <li><strong>Chat content</strong> — reloads the active session under the new Profile</li>
                <li><strong>Settings changes</strong> — editing <code>hermes.profile</code>, <code>hermes.path</code>, etc. also reconnects, similar to switching Profile</li>
            </ul>

            <h3>4. Why isn't the model list complete?</h3>
            <p>The list shows models <strong>actually available under the current Hermes Profile</strong>, not every model on the internet. The extension fetches them via ACP (<code>models.availableModels</code> from <code>session/new</code>, or <code>model.options</code>).</p>
            <p><strong>Common reasons:</strong></p>
            <ul>
                <li>Provider or API key not configured in the Profile</li>
                <li>Profile only enables a subset of models</li>
                <li>Hermes version or ACP did not return the full list</li>
                <li>Agent not connected or returned no list — configure fallback <code>hermes.models</code> in Settings</li>
            </ul>
            <p class="dim">Check: run <code>hermes acp</code> in a terminal with the same Profile; review Hermes config files.</p>

            <h3>5. Will this extension keep getting updates?</h3>
            <p><strong>Yes.</strong> Published on the VS Code Marketplace; use <strong>More → Check for Updates</strong> to check and jump to this extension.</p>
            <p>Hermes Agent and this extension <strong>evolve independently</strong>: the extension tracks ACP, model selection, Profile support, etc.; underlying capabilities depend on Hermes itself. Watch <a href="#" data-url="https://github.com/jove-rina/rina-hermes-acp">Releases and Issues on GitHub</a>.</p>

            <h3>6. How do I report a bug?</h3>
            <p>Open an Issue on GitHub:<br><a href="#" data-url="https://github.com/jove-rina/rina-hermes-acp/issues">github.com/jove-rina/rina-hermes-acp/issues</a></p>
            <p><strong>Please include:</strong></p>
            <ul>
                <li>VS Code version (Help → About)</li>
                <li>Extension version (More → About)</li>
                <li>Hermes version (<code>hermes --version</code> in terminal)</li>
                <li>Steps to reproduce, expected vs actual behavior</li>
                <li>Relevant logs (More → Logs, copy ERROR / WARNING lines)</li>
            </ul>

            <h3>7. How do I suggest a new feature?</h3>
            <p>Same channel: <a href="#" data-url="https://github.com/jove-rina/rina-hermes-acp/issues">GitHub Issues</a>, with <code>[Feature Request]</code> in the title.</p>
            <p>Describe the <strong>use case</strong>, <strong>expected behavior</strong>, and whether alternatives are acceptable. The more specific, the easier to prioritize.</p>`,

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
    multiSelectDeselectAll: 'Deselect all',
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
    localHistoryDivider: 'Prior session memory above — not carried into the new session',
    localHistoryDividerTitle: 'Historical session memory is not automatically included in the new agent context',
    localHistoryBadge: 'Local',

    switchSessionPromptTitle: 'Hermes is responding',
    switchSessionPromptBody: 'Switching sessions will interrupt the current reply. Wait for it to finish, or confirm to switch.',
    switchSessionConfirm: 'Switch',
    switchSessionStay: 'Stay',

    contextAttachHeaderLead: 'Session reset?',
    contextAttachHeaderRest: 'Attach prior session memory? Selecting memory uses more input tokens.',
    contextAttachTooltip: 'Hermes resets the session when you switch models or sessions. The new session has no memory of the prior context. Use this option to continue with prior memory.\nMemory includes user, assistant, and permission messages only — thought and tool messages are excluded.\nNote: This option appears only once in a new session and disappears after the first successful reply.',
    contextAttachPlaceholder: 'Select session memory',
    contextAttachNone: 'Do not attach prior session memory',
    contextAttachLast2: 'Attach last 2 conversation memories (user/assistant/permission)',
    contextAttachLast10: 'Attach last 10 conversation memories (user/assistant/permission)',
    contextAttachAll: 'Attach all conversation memories (user/assistant/permission)',
    contextAttachCustom: 'Choose conversation memories',
    contextAttachCustomNone: 'You have not selected any memories',
    contextAttachConfirm: 'Attach selected',
    contextAttachSelected: 'Attach {0} selected memories from prior session',
    contextAttachPrefixHeader: 'Prior session memory for reference:',
    contextAttachSendPrompt: 'You selected session memory. Attach it to this message?',
    contextAttachSendYes: 'Attach',
    contextAttachSendNo: 'Do not attach',
    contextAttachPreviewTitle: 'Memory to attach ({0} selected / ~{1} input tokens)',
};
