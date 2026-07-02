import { getLocale as readLocale } from '../core/locale.js';
import { maybeScrollToBottom } from '../messages/scroll.js';
import { createConnection } from '../connection/index.js';
import { createInfoModals } from '../ui/info-modals.js';
import { createLogViewer } from '../log/viewer.js';
import { createInputMode } from '../input/send.js';
import { createSwitchSessionModal } from '../sessions/switch-modal.js';
import { createGroupUtilsBundle } from './bootstrap/create-group-utils-bundle.js';
import { createMessageGraph } from './bootstrap/create-message-graph.js';import { createAppServices } from './bootstrap/create-app-services.js';
import { wireApp } from './bootstrap/wire-app.js';

/**
 * @param {{
 *   session: ReturnType<import('../core/session-state.js').createSessionState>,
 *   getPlaceholder: () => HTMLElement | null,
 *   setPlaceholder: (el: HTMLElement | null) => void,
 *   detectEnvBtn: HTMLElement | null,
 *   setLocale: (locale: Record<string, string>) => void,
 * }} ctx
 */
export function bootstrapApp(ctx) {
    const session = ctx.session;
    const getLocale = () => readLocale();

    const connection = createConnection({
        getLocale,
        getPlaceholder: ctx.getPlaceholder,
    });
    connection.bindConnectionEvents();

    const groupBundle = createGroupUtilsBundle({ getLocale, session });

    const infoModals = createInfoModals({ getLocale });
    infoModals.bindInfoModalEvents();

    const logViewer = createLogViewer({ getLocale });
    logViewer.bindLogViewerEvents();

    const inputMode = createInputMode({ getCanSend: session.getCanSend });
    const setInputMode = inputMode.setInputMode;

    const switchSession = createSwitchSessionModal({
        getLocale,
        getActiveSessionId: session.getActiveSessionId,
        getIsPrompting: session.getIsPrompting,
    });
    switchSession.bindSwitchSessionEvents();

    const contentBlocksRef = {
        /** @type {(...args: unknown[]) => unknown} */
        setupContentBlocks: null,
    };

    const graph = createMessageGraph({
        session,
        getPlaceholder: ctx.getPlaceholder,
        getLocale,
        setInputMode,
        requestSessionExport: groupBundle.requestSessionExport,
        reindexSessionIndices: groupBundle.reindexSessionIndices,
        assignSessionIndex: groupBundle.assignSessionIndex,
        setupContentBlocks: (...a) => contentBlocksRef.setupContentBlocks(...a),
    });
    groupBundle.bindMessagesRef(graph.messages);

    const services = createAppServices({
        session,
        getLocale,
        getPlaceholder: ctx.getPlaceholder,
        setPlaceholder: ctx.setPlaceholder,
        setInputMode,
        localeText,
        maybeScrollToBottom,
        requestSwitchSession: switchSession.requestSwitchSession,
        requestSessionExport: groupBundle.requestSessionExport,
        assignSessionIndex: groupBundle.assignSessionIndex,
        infoModals,
        ...graph,
    });
    contentBlocksRef.setupContentBlocks = services.setupContentBlocks;

    wireApp({
        session,
        getLocale,
        getPlaceholder: ctx.getPlaceholder,
        setLocale: ctx.setLocale,
        detectEnvBtn: ctx.detectEnvBtn,
        setInputMode,
        connection,
        infoModals,
        logViewer,
        maybeScrollToBottom,
        applyLocale: services.applyLocale,
        ...graph,
        ...services,
    });

    return {
        applyLocale: services.applyLocale,
    };
}
