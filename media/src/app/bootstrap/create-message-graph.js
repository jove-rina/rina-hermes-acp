import { filePickerEl } from '../../core/dom-refs.js';
import { maybeScrollToBottom } from '../../messages/scroll.js';
import { syncInputHeightFromContent } from '../../input/height.js';
import { createAuxiliaryMessages } from '../../messages/auxiliary.js';
import { createChatSearch } from '../../search/chat-search.js';
import { createSessionRender } from '../../messages/session-render.js';
import { createFileRefs } from '../../input/file-refs.js';
import { createAddMessage } from '../../messages/add-message.js';
import { createContextAttach } from '../../context-attach/index.js';
import { createSend } from '../../input/send.js';
import { createMultiSelect } from '../../multi-select/index.js';
import { createPickers } from '../../pickers/index.js';
import { isSelectableRole } from '../../messages/group-utils.js';
import { createQuickActions } from '../../input/quick-actions.js';

/**
 * Wires message/input factories that depend on each other via lazy closures.
 *
 * @param {{
 *   session: ReturnType<import('../../core/session-state.js').createSessionState>,
 *   getPlaceholder: () => HTMLElement | null,
 *   getLocale: () => Record<string, string>,
 *   setInputMode: (mode: string) => void,
 *   requestSessionExport: (...args: unknown[]) => void,
 *   reindexSessionIndices: () => void,
 *   assignSessionIndex: (group: Element) => void,
 * }} ctx
 */
export function createMessageGraph(ctx) {
    const session = ctx.session;

    let quickActions;
    let messages;
    let contextAttach;
    let auxiliary;
    let chatSearch;
    let pickers;
    let multiSelect;
    let send;
    let sessionRender;

    const fileRefs = createFileRefs({
        filePickerEl,
        getLocale: ctx.getLocale,
        syncInputHeightFromContent,
        updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),
    });
    fileRefs.bindFilePickerInputHandlers();

    multiSelect = createMultiSelect({
        getLocale: ctx.getLocale,
        getMultiSelectMode: session.getMultiSelectMode,
        setMultiSelectMode: session.setMultiSelectMode,
        getMultiSelectPurpose: session.getMultiSelectPurpose,
        setMultiSelectPurpose: session.setMultiSelectPurpose,
        isAttachableMemoryGroup: (g) => contextAttach.isAttachableMemoryGroup(g),
        hideContextAttachPreview: () => contextAttach.hideContextAttachPreview(),
        updateContextAttachButtonLabel: () => contextAttach.updateContextAttachButtonLabel(),
        clearContextAttachSelectableTargets: () => contextAttach.clearContextAttachSelectableTargets(),
        handleExitMultiSelectAttachMode: (indices) => contextAttach.handleExitMultiSelectAttachMode(indices),
        confirmContextAttachSelection: () => contextAttach.confirmContextAttachSelection(),
        reindexSessionIndices: ctx.reindexSessionIndices,
        updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),
        placeholder: ctx.getPlaceholder(),
        requestSessionExport: ctx.requestSessionExport,
    });

    messages = createAddMessage({
        getLocale: ctx.getLocale,
        placeholder: ctx.getPlaceholder(),
        getStreamingMessageId: session.getStreamingMessageId,
        setStreamingMessageId: session.setStreamingMessageId,
        getThoughtMsgId: session.getThoughtMsgId,
        setThoughtMsgId: session.setThoughtMsgId,
        chatSearchHasQuery: () => chatSearch.hasQuery(),
        scheduleChatSearch: () => chatSearch.scheduleChatSearch(),
        maybeScrollToBottom,
        isSelectableRole,
        setGroupSelected: (...a) => multiSelect.setGroupSelected(...a),
        wireSelectableGroup: (...a) => multiSelect.wireSelectableGroup(...a),
        assignSessionIndex: ctx.assignSessionIndex,
        buildAuxiliaryMessage: (...a) => auxiliary.buildAuxiliaryMessage(...a),
        wireAuxiliaryMessage: (...a) => auxiliary.wireAuxiliaryMessage(...a),
        resetToolAggregation: () => auxiliary.resetToolAggregation(),
        clearAllToolLive: () => auxiliary.clearAllToolLive(),
        enableStopAfterAgentOutput: () => messages.enableStopAfterAgentOutput(),
        processFileRefs: (...a) => fileRefs.processFileRefs(...a),
        setupContentBlocks: (...a) => ctx.setupContentBlocks(...a),
        setAuxMessageLive: (...a) => auxiliary.setAuxMessageLive(...a),
        finalizeAuxiliaryBubble: (...a) => auxiliary.finalizeAuxiliaryBubble(...a),
        enterMultiSelectMode: (...a) => multiSelect.enterMultiSelectMode(...a),
        updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),
        getAwaitingFirstChunk: session.getAwaitingFirstChunk,
        setAwaitingFirstChunk: session.setAwaitingFirstChunk,
        getIsPrompting: session.getIsPrompting,
        getCanSend: session.getCanSend,
        setInputMode: ctx.setInputMode,
    });

    send = createSend({
        hideFilePicker: () => fileRefs.hideFilePicker(),
        addMessage: (...a) => messages.addMessage(...a),
        syncInputHeightFromContent,
        updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),
        setAwaitingFirstChunk: session.setAwaitingFirstChunk,
        setInputMode: ctx.setInputMode,
        buildContextAttachPayload: (...a) => contextAttach.buildContextAttachPayload(...a),
        hasUnconfirmedCustomMemorySelection: () => contextAttach.hasUnconfirmedCustomMemorySelection(),
        openContextAttachSendModal: (...a) => contextAttach.openContextAttachSendModal(...a),
        getCanSend: session.getCanSend,
        getMultiSelectMode: session.getMultiSelectMode,
        exitMultiSelectMode: () => multiSelect.exitMultiSelectMode(),
    });
    send.bindSendEvents();

    contextAttach = createContextAttach({
        getLocale: ctx.getLocale,
        getMessagePlainText: (...a) => messages.getMessagePlainText(...a),
        getMultiSelectPurpose: session.getMultiSelectPurpose,
        getMultiSelectMode: session.getMultiSelectMode,
        exitMultiSelectMode: () => multiSelect.exitMultiSelectMode(),
        enterMultiSelectMode: (...a) => multiSelect.enterMultiSelectMode(...a),
        getSelectedMessageIndices: (...a) => multiSelect.getSelectedMessageIndices(...a),
        setGroupSelected: (...a) => multiSelect.setGroupSelected(...a),
        setGroupsSelected: (...a) => multiSelect.setGroupsSelected(...a),
        wireSelectableGroup: (...a) => multiSelect.wireSelectableGroup(...a),
        closeAllDropdowns: () => pickers.closeAllDropdowns(),
        executeSendMessage: (...a) => send.executeSendMessage(...a),
    });
    contextAttach.bindContextAttachEvents();

    pickers = createPickers({
        getLocale: ctx.getLocale,
        hideFilePicker: () => fileRefs.hideFilePicker(),
        hideContextAttachTooltip: () => contextAttach.hideContextAttachTooltip(),
        hideContextAttachPreview: () => contextAttach.hideContextAttachPreview(),
    });
    pickers.bindPickerEvents();
    multiSelect.bindMultiSelectEvents();

    sessionRender = createSessionRender({
        getLocale: ctx.getLocale,
        setupContentBlocks: (...a) => ctx.setupContentBlocks(...a),
        processFileRefs: (...a) => fileRefs.processFileRefs(...a),
        setAuxiliaryContent: (...a) => auxiliary.setAuxiliaryContent(...a),
        chatSearchHasQuery: () => chatSearch.hasQuery(),
        scheduleChatSearch: () => chatSearch.scheduleChatSearch(),
    });

    const {
        getMessagePlainText,
        addMessage,
        finalizeAssistantBubble,
        enableStopAfterAgentOutput,
        finishStreaming,
    } = messages;

    auxiliary = createAuxiliaryMessages({
        getLocale: ctx.getLocale,
        setupContentBlocks: (...args) => ctx.setupContentBlocks(...args),
        processFileRefs: (...a) => fileRefs.processFileRefs(...a),
        maybeScrollToBottom,
        get addMessage() { return addMessage; },
        get finalizeAssistantBubble() { return finalizeAssistantBubble; },
        enableStopAfterAgentOutput,
    });
    chatSearch = createChatSearch({ getMessagePlainText });
    chatSearch.bindChatSearchEvents();

    quickActions = createQuickActions({
        getLocale: ctx.getLocale,
        hideFilePicker: () => fileRefs.hideFilePicker(),
        syncInputHeightFromContent,
        clearChatSearch: () => chatSearch.clearChatSearch(),
        scheduleChatSearch: () => chatSearch.scheduleChatSearch(),
    });
    quickActions.bindQuickActionEvents();

    return {
        fileRefs,
        multiSelect,
        messages,
        send,
        contextAttach,
        pickers,
        sessionRender,
        auxiliary,
        chatSearch,
        quickActions,
        getMessagePlainText,
        addMessage,
        finalizeAssistantBubble,
        enableStopAfterAgentOutput,
        finishStreaming,
    };
}
