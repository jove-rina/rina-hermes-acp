import { createContentBlocks } from '../../messages/content-blocks.js';
import { createPermissions } from '../../messages/permissions.js';
import { createSessionTabs } from '../../sessions/tabs.js';
import { createLocalHistory } from '../../sessions/local-history.js';
import { createTokenUsage } from '../../ui/token-usage.js';
import { createChatReset } from '../../sessions/chat-reset.js';
import { createApplyLocale } from '../../locale/apply-locale.js';

/**
 * @param {Record<string, unknown>} ctx
 */
export function createAppServices(ctx) {
    const localHistory = createLocalHistory({
        getLocale: ctx.getLocale,
        getPlaceholder: ctx.getPlaceholder,
    });

    const tokenUsage = createTokenUsage({ localeText: ctx.localeText });

    const {
        updateQuickActionBtns,
        appendToInput,
        insertIntoInput,
        insertToEditor,
    } = ctx.quickActions;

    const {
        removeLocalHistoryDivider,
        insertLocalHistoryDivider,
    } = localHistory;

    const permissions = createPermissions({
        getLocale: ctx.getLocale,
        localeText: ctx.localeText,
        assignSessionIndex: ctx.assignSessionIndex,
        finalizeAssistantBubble: ctx.finalizeAssistantBubble,
        placeholder: ctx.getPlaceholder(),
        enableStopAfterAgentOutput: ctx.enableStopAfterAgentOutput,
        maybeScrollToBottom: ctx.maybeScrollToBottom,
    });
    const {
        restorePermissionMessage,
        updatePermissionContent,
        showPermissionRequest,
        dismissPermissionRequest,
    } = permissions;

    const chatReset = createChatReset({
        getLocale: ctx.getLocale,
        getPlaceholder: ctx.getPlaceholder,
        setPlaceholder: ctx.setPlaceholder,
        getCanSend: ctx.session.getCanSend,
        cancelSessionMarkdownRender: () => ctx.sessionRender.cancelSessionMarkdownRender(),
        scheduleSessionMarkdownRender: () => ctx.sessionRender.scheduleSessionMarkdownRender(),
        clearChatSearch: () => ctx.chatSearch.clearChatSearch(),
        exitMultiSelectMode: () => ctx.multiSelect.exitMultiSelectMode(),
        removeLocalHistoryDivider: () => localHistory.removeLocalHistoryDivider(),
        insertLocalHistoryDivider: () => localHistory.insertLocalHistoryDivider(),
        forceHideContextAttachPicker: () => ctx.contextAttach.forceHideContextAttachPicker(),
        resetStreamingState: ctx.session.resetStreamingState,
        clearToolState: () => ctx.auxiliary.clearToolState(),
        resetSessionIndex: ctx.session.resetSessionIndex,
        resetToolAggregation: () => ctx.auxiliary.resetToolAggregation(),
        clearPendingPermissions: () => permissions.clearPendingPermissions(),
        updateQuickActionBtns,
        updateTokenUsage: tokenUsage.updateTokenUsage,
        setInputMode: ctx.setInputMode,
        restorePermissionMessage: (...a) => permissions.restorePermissionMessage(...a),
        addMessage: (...a) => ctx.messages.addMessage(...a),
    });

    const { newChat, clearChat, restoreHistory } = chatReset;

    const { setupContentBlocks, closeInsertDropdowns } = createContentBlocks({
        getLocale: ctx.getLocale,
        appendToInput,
        insertToEditor,
    });

    const applyLocale = createApplyLocale({
        getLocale: ctx.getLocale,
        refreshModelButtonDisplay: () => ctx.pickers.refreshModelButtonDisplay(),
        updateContextAttachButtonLabel: () => ctx.contextAttach.updateContextAttachButtonLabel(),
        renderContextAttachOptions: () => ctx.contextAttach.renderContextAttachOptions(),
        updateMultiSelectToolbar: () => ctx.multiSelect.updateMultiSelectToolbar(),
        applyInfoModalLocale: () => ctx.infoModals.applyInfoModalLocale(),
        refreshAllPermissionLocale: () => permissions.refreshAllPermissionLocale(),
        refreshAllAuxiliaryLocale: () => ctx.auxiliary.refreshAllAuxiliaryLocale(),
    }).applyLocale;

    const { renderSessionTabs, hideTabContextMenu } = createSessionTabs({
        getLocale: ctx.getLocale,
        getLastSessions: ctx.session.getLastSessions,
        setLastSessions: ctx.session.setLastSessions,
        getLastActiveSessionId: ctx.session.getLastActiveSessionId,
        setLastActiveSessionId: ctx.session.setLastActiveSessionId,
        getActiveSessionId: ctx.session.getActiveSessionId,
        setActiveSessionId: ctx.session.setActiveSessionId,
        requestSwitchSession: ctx.requestSwitchSession,
        requestSessionExport: ctx.requestSessionExport,
    });

    return {
        localHistory,
        tokenUsage,
        permissions,
        chatReset,
        setupContentBlocks,
        closeInsertDropdowns,
        applyLocale,
        renderSessionTabs,
        hideTabContextMenu,
        newChat,
        clearChat,
        restoreHistory,
        restorePermissionMessage,
        updatePermissionContent,
        showPermissionRequest,
        dismissPermissionRequest,
        insertLocalHistoryDivider,
        insertIntoInput,
    };
}
