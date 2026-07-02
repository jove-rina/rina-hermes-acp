import { inputEl } from '../../core/dom-refs.js';
import { resetAutoScrollFollow } from '../../messages/scroll.js';
import { showModal } from '../../ui/modal.js';
import { createAppHandlers } from '../../bridge/app-handlers.js';
import { initMessageBridge } from '../../bridge/message-bridge.js';
import { bindGlobalEvents } from '../../ui/global-events.js';
import { getLocale as readLocale } from '../../core/locale.js';

/**
 * @param {Record<string, unknown>} ctx
 */
export function wireApp(ctx) {
    bindGlobalEvents({
        detectEnvBtn: ctx.detectEnvBtn,
        closeInsertDropdowns: ctx.closeInsertDropdowns,
        hideTabContextMenu: ctx.hideTabContextMenu,
        hideContextAttachTooltip: () => ctx.contextAttach.hideContextAttachTooltip(),
        hideContextAttachPreview: () => ctx.contextAttach.hideContextAttachPreview(),
        isContextAttachPreviewOpen: () => ctx.contextAttach.isPreviewOpen(),
        isInsideContextAttachPreview: (target) => ctx.contextAttach.isInsideContextAttachPreview(target),
    });

    initMessageBridge(createAppHandlers({
        placeholder: ctx.getPlaceholder(),
        isMessageForActiveSession: ctx.session.isMessageForActiveSession,
        addMessage: ctx.addMessage,
        handleToolMessage: ctx.auxiliary.handleToolMessage,
        getThoughtMsgId: ctx.session.getThoughtMsgId,
        setThoughtMsgId: ctx.session.setThoughtMsgId,
        setAuxiliaryContent: ctx.auxiliary.setAuxiliaryContent,
        setAuxMessageLive: ctx.auxiliary.setAuxMessageLive,
        maybeScrollToBottom: ctx.maybeScrollToBottom,
        restoreHistory: ctx.restoreHistory,
        finalizeAssistantBubble: ctx.finalizeAssistantBubble,
        getIsPrompting: ctx.session.getIsPrompting,
        getAwaitingFirstChunk: ctx.session.getAwaitingFirstChunk,
        setInputMode: ctx.setInputMode,
        showPermissionRequest: ctx.showPermissionRequest,
        pendingPermissions: ctx.permissions.pendingPermissions,
        updatePermissionContent: ctx.updatePermissionContent,
        dismissPermissionRequest: ctx.dismissPermissionRequest,
        getLocale: ctx.getLocale,
        setConnectionAttempted: (v) => ctx.connection.setConnectionAttempted(v),
        updateStatus: ctx.connection.updateStatus,
        setIsPrompting: ctx.session.setIsPrompting,
        setAwaitingFirstChunk: ctx.session.setAwaitingFirstChunk,
        resetToolAggregation: ctx.auxiliary.resetToolAggregation,
        finishStreaming: ctx.finishStreaming,
        setCanSend: ctx.session.setCanSend,
        inputEl,
        scheduleSessionMarkdownRender: ctx.sessionRender.scheduleSessionMarkdownRender,
        maybeFocusInputAfterResponse: ctx.session.maybeFocusInputAfterResponse,
        resetAutoScrollFollow,
        updateTokenUsage: ctx.tokenUsage.updateTokenUsage,
        buildConnectionErrorPlaceholder: ctx.connection.buildConnectionErrorPlaceholder,
        bindConnectionErrorActions: ctx.connection.bindConnectionErrorActions,
        refreshLocale: () => {
            ctx.setLocale(readLocale());
            ctx.applyLocale();
        },
        getLastSessions: ctx.session.getLastSessions,
        getLastActiveSessionId: ctx.session.getLastActiveSessionId,
        renderSessionTabs: ctx.renderSessionTabs,
        renderProfileList: ctx.pickers.renderProfileList,
        renderModelList: ctx.pickers.renderModelList,
        appendLog: ctx.logViewer.appendLog,
        setPluginInfo: ctx.infoModals.setPluginInfo,
        renderAboutContent: ctx.infoModals.renderAboutContent,
        getFilePickerRequestId: () => ctx.fileRefs.getFilePickerRequestId(),
        renderFilePickerItems: ctx.fileRefs.renderFilePickerItems,
        previewRequests: ctx.fileRefs.previewRequests,
        showFilePreview: ctx.fileRefs.showFilePreview,
        positionFilePreview: ctx.fileRefs.positionFilePreview,
        showContextAttachPicker: ctx.contextAttach.showContextAttachPicker,
        hideContextAttachPicker: ctx.contextAttach.hideContextAttachPicker,
        insertLocalHistoryDivider: ctx.insertLocalHistoryDivider,
        newChat: ctx.newChat,
        clearChat: ctx.clearChat,
        insertIntoInput: ctx.insertIntoInput,
        openLogModal: ctx.logViewer.openLogModal,
        showModal,
        aboutModal: ctx.infoModals.aboutModal,
        helpModal: ctx.infoModals.helpModal,
        faqModal: ctx.infoModals.faqModal,
    }));
}
