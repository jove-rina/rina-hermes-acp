import type { ContextAttachOption } from '../chat/contextAttach';
import type { PermissionOption } from '../acp/AcpClient';
import type { LocaleStrings } from '../i18n/types';

/** Shared detect-progress fields for environment detection UI messages. */
export type DetectProgressPayload = {
    step?: string;
    status?: string;
    brief?: string;
    detail?: string;
    paths?: string[];
    count?: number;
    verifiedCount?: number;
    totalCount?: number;
    reportStatus?: string;
};

/** Payload for {@link WebviewToExtensionMessage} `sendMessage`. */
export type SendMessagePayload = {
    type: 'sendMessage';
    text: string;
    contextAttach?: ContextAttachOption;
};

/** Messages posted from the webview to the extension host. */
export type WebviewToExtensionMessage =
    | { type: 'ready' }
    | SendMessagePayload
    | { type: 'cancel' }
    | { type: 'newChat' }
    | { type: 'clearChat' }
    | { type: 'retry' }
    | { type: 'getSessions' }
    | { type: 'getProfiles' }
    | { type: 'getModels' }
    | { type: 'openSettings' }
    | { type: 'openExternal'; url: string }
    | { type: 'openFile'; path: string }
    | { type: 'listFiles'; query?: string; requestId: string }
    | { type: 'previewFile'; path: string; requestId: string }
    | { type: 'insertEditor'; text?: string }
    | { type: 'deleteMessages'; indices: number[] }
    | { type: 'deleteSession'; sessionId: string }
    | { type: 'renameSession'; sessionId: string; title: string }
    | { type: 'reorderSessions'; sessionIds: string[] }
    | { type: 'closeSessions'; sessionId: string; mode: string }
    | { type: 'togglePinSession'; sessionId: string }
    | { type: 'sessionExport'; sessionId: string; action: string; indices?: number[] }
    | { type: 'switchAgent'; agentName: string }
    | { type: 'switchSession'; sessionId: string; interrupt?: boolean }
    | { type: 'switchModel'; configId: string; valueId: string }
    | { type: 'detectEnvironment' }
    | { type: 'detectEnvironmentDismiss' }
    | { type: 'configureEnvironmentBrowse' }
    | { type: 'configureEnvironmentDetect'; currentPath?: string }
    | { type: 'configureEnvironmentSave'; path: string }
    | { type: 'configureEnvironmentSystem'; path: string }
    | { type: 'configureEnvironmentOpenDirectory'; path: string }
    | { type: 'configureEnvironmentDetectClose' }
    | { type: 'permissionResponse'; id: string; optionId?: string | null };

/** Messages posted from the extension host to the webview. */
export type ExtensionToWebviewMessage =
    | { type: 'status'; status: string; message?: string; sessionId?: string }
    | { type: 'addMessage'; role: string; text: string; sessionId?: string; toolCallId?: string }
    | { type: 'restoreHistory'; messages: unknown[]; localHistoryOnly?: boolean; sessionId?: string }
    | { type: 'finishAssistantBubble'; sessionId?: string }
    | { type: 'permissionRequest'; id: string; sessionId?: string; title: string; detail?: string; options: PermissionOption[] }
    | { type: 'permissionUpdate'; id: string; sessionId?: string; title?: string; detail?: string; options?: PermissionOption[] }
    | { type: 'permissionDismiss'; id: string; sessionId?: string }
    | { type: 'sessionList'; sessions: unknown[]; activeSessionId: string }
    | { type: 'sessionExport'; action: string; markdown?: string; filename?: string }
    | { type: 'setLocale'; locale: LocaleStrings }
    | { type: 'tokenUsage'; used: number; size: number }
    | { type: 'config'; showThoughts?: boolean; showToolCalls?: boolean }
    | { type: 'pluginInfo'; displayName?: string; version?: string; publisher?: string; description?: string; repository?: string; iconUri?: string }
    | { type: 'profileList'; profiles?: unknown[]; agents?: unknown[] }
    | { type: 'modelList'; configId?: string; models?: unknown[]; groups?: unknown[]; currentValueId?: string; currentLabel?: string; fromAgent?: boolean }
    | { type: 'agentList'; agents?: unknown[] }
    | { type: 'activeAgent'; name: string }
    | { type: 'activeProfile'; name: string }
    | { type: 'fileList'; requestId: string; files?: unknown[] }
    | { type: 'filePreview'; requestId: string; path?: string; content?: string; language?: string; error?: string }
    | { type: 'log'; line: string; level: string }
    | { type: 'showContextAttach'; count?: number }
    | { type: 'hideContextAttach' }
    | { type: 'markSessionReset' }
    | { type: 'insertInput'; text?: string }
    | { type: 'detectEnvironmentStart'; mode?: string }
    | ({ type: 'detectEnvironmentProgress' } & DetectProgressPayload)
    | { type: 'detectEnvironmentEnd'; status?: string; message?: string; mode?: string; brief?: string; summaryStatus?: string }
    | { type: 'configureEnvironmentOpen'; currentPath?: string; systemEnvVar?: string; systemEnvTarget?: string }
    | { type: 'configureEnvironmentDetectStart' }
    | ({ type: 'configureEnvironmentDetectProgress' } & DetectProgressPayload)
    | { type: 'configureEnvironmentDetectEnd'; status?: string; message?: string; summary?: string; executables?: unknown[] }
    | { type: 'configureEnvironmentDetectClosed' }
    | { type: 'configureEnvironmentBrowseResult'; path?: string; error?: string }
    | { type: 'configureEnvironmentSaveResult'; ok?: boolean; error?: string; path?: string }
    | { type: 'newChat' }
    | { type: 'clearChat' }
    | { type: 'openLogs' }
    | { type: 'openAbout' }
    | { type: 'openHelp' }
    | { type: 'openFaq' };

export const WEBVIEW_TO_EXTENSION_MESSAGE_TYPES = [
    'ready',
    'sendMessage',
    'cancel',
    'newChat',
    'clearChat',
    'retry',
    'getSessions',
    'getProfiles',
    'getModels',
    'openSettings',
    'openExternal',
    'openFile',
    'listFiles',
    'previewFile',
    'insertEditor',
    'deleteMessages',
    'deleteSession',
    'renameSession',
    'reorderSessions',
    'closeSessions',
    'togglePinSession',
    'sessionExport',
    'switchAgent',
    'switchSession',
    'switchModel',
    'detectEnvironment',
    'detectEnvironmentDismiss',
    'configureEnvironmentBrowse',
    'configureEnvironmentDetect',
    'configureEnvironmentSave',
    'configureEnvironmentSystem',
    'configureEnvironmentOpenDirectory',
    'configureEnvironmentDetectClose',
    'permissionResponse',
] as const;

export type WebviewToExtensionMessageType = typeof WEBVIEW_TO_EXTENSION_MESSAGE_TYPES[number];

export const EXTENSION_TO_WEBVIEW_MESSAGE_TYPES = [
    'status',
    'addMessage',
    'restoreHistory',
    'finishAssistantBubble',
    'permissionRequest',
    'permissionUpdate',
    'permissionDismiss',
    'sessionList',
    'sessionExport',
    'setLocale',
    'tokenUsage',
    'config',
    'pluginInfo',
    'profileList',
    'modelList',
    'agentList',
    'activeAgent',
    'activeProfile',
    'fileList',
    'filePreview',
    'log',
    'showContextAttach',
    'hideContextAttach',
    'markSessionReset',
    'insertInput',
    'detectEnvironmentStart',
    'detectEnvironmentProgress',
    'detectEnvironmentEnd',
    'configureEnvironmentOpen',
    'configureEnvironmentDetectStart',
    'configureEnvironmentDetectProgress',
    'configureEnvironmentDetectEnd',
    'configureEnvironmentDetectClosed',
    'configureEnvironmentBrowseResult',
    'configureEnvironmentSaveResult',
    'newChat',
    'clearChat',
    'openLogs',
    'openAbout',
    'openHelp',
    'openFaq',
] as const;

export type ExtensionToWebviewMessageType = typeof EXTENSION_TO_WEBVIEW_MESSAGE_TYPES[number];

export function isWebviewToExtensionMessageType(type: string): type is WebviewToExtensionMessageType {
    return (WEBVIEW_TO_EXTENSION_MESSAGE_TYPES as readonly string[]).includes(type);
}

export function isExtensionToWebviewMessageType(type: string): type is ExtensionToWebviewMessageType {
    return (EXTENSION_TO_WEBVIEW_MESSAGE_TYPES as readonly string[]).includes(type);
}
