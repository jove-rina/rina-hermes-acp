export type SupportedLocale = 'en' | 'zh-cn';

export interface LocaleStrings {
    // Extension host
    selectCodeFirst: string;
    allowHermesRun: string;
    allow: string;
    deny: string;
    waitForResponse: string;
    failedSwitchModel: string;
    savedModelUnavailable: string;
    modelPreferenceSaved: string;
    hermesNotConnected: string;
    couldNotOpenFile: string;
    hermesNotConnectedConnecting: string;
    fileAccessDenied: string;
    fileReadError: string;
    newChat: string;
    defaultAgent: string;
    statusStartingAcp: string;
    statusHermesThinking: string;
    statusProcessError: string;
    statusProcessExited: string;
    statusConnectionFailed: string;
    statusNewSessionFailed: string;

    // WebView — toolbar & status
    connectionStatus: string;
    statusDisconnected: string;
    statusConnecting: string;
    statusReady: string;
    statusThinking: string;
    statusError: string;
    retry: string;
    switchProfile: string;
    profile: string;
    profiles: string;
    switchModel: string;
    model: string;
    models: string;
    newChatBtn: string;
    moreOptions: string;
    menuAbout: string;
    menuSettings: string;
    menuHelp: string;
    menuLogs: string;

    // WebView — placeholder & connection
    connectingTitle: string;
    connectingHint: string;
    readyPlaceholder: string;
    connectionError: string;
    retryConnect: string;

    // WebView — input area
    inputPlaceholder: string;
    resizeHandle: string;
    filePicker: string;
    searchChat: string;
    searchPrev: string;
    searchNext: string;
    clearChat: string;
    clearInput: string;
    copySession: string;
    quickActions: string;
    quickActionsExpand: string;
    quickActionsCollapse: string;
    tokenUsage: string;
    send: string;
    stop: string;
    cancelResponse: string;

    // WebView — modals
    hermesLogs: string;
    copy: string;
    clear: string;
    noLogs: string;
    aboutTitle: string;
    helpTitle: string;

    // WebView — about (rendered in JS)
    aboutVersion: string;
    aboutDescription: string;
    aboutFeatureTabs: string;
    aboutFeaturePickers: string;
    aboutFeatureInsert: string;
    aboutFeatureTools: string;
    repository: string;

    // WebView — help (HTML body)
    helpHtml: string;

    // WebView — messages & misc
    roleYou: string;
    roleHermes: string;
    roleThought: string;
    roleTool: string;
    roleMessage: string;
    permissionTitle: string;
    permissionCancelled: string;
    permissionAllowOnce: string;
    permissionAllowAlways: string;
    permissionAllowSession: string;
    permissionRejectOnce: string;
    permissionRejectAlways: string;
    permissionDeny: string;
    permissionExpand: string;
    permissionCollapse: string;
    permissionShowMore: string;
    permissionCardCollapse: string;
    permissionCardExpand: string;
    permissionSelected: string;
    insert: string;
    emptyFile: string;
    noMatchingFiles: string;
    searchingFiles: string;
    configureAgents: string;
    noModels: string;
    modelFromAgent: string;
    modelLocalPreference: string;
    tokenUsageLabel: string;
    copied: string;
    clickToInsert: string;
    insertToInput: string;
    insertToEditor: string;
    insertMenu: string;
    noActiveEditor: string;
    selectMessages: string;
    multiSelectAll: string;
    multiSelectDelete: string;
    multiSelectCopy: string;
    multiSelectExport: string;
    multiSelectExit: string;
    multiSelectCount: string;
    fileLinkTitle: string;
    tabRename: string;
    tabClose: string;
    tabContextSid: string;
    tabContextExport: string;
    tabContextCopy: string;
    tabContextRename: string;
    tabContextClose: string;
    tabContextCloseOthers: string;
    tabContextCloseLeft: string;
    tabContextCloseRight: string;
    tabContextCloseAll: string;
    tabContextPin: string;
    tabContextUnpin: string;
    copySid: string;
    sessionExportSessionId: string;
    sessionExportModel: string;
    sessionExportDate: string;
    sessionRendering: string;
    localHistoryDivider: string;
    localHistoryDividerTitle: string;
    localHistoryBadge: string;
}

export type LocaleKey = keyof LocaleStrings;
