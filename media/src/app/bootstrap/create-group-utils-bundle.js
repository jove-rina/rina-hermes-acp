import { createGroupUtils } from '../../messages/group-utils.js';

/**
 * Group utils with lazy binding to messages.getMessagePlainText (breaks circular deps).
 *
 * @param {{
 *   getLocale: () => Record<string, string>,
 *   session: ReturnType<import('../../core/session-state.js').createSessionState>,
 * }} ctx
 */
export function createGroupUtilsBundle(ctx) {
    let messages;

    const groupUtils = createGroupUtils({
        getLocale: ctx.getLocale,
        getMessagePlainText: (...a) => messages.getMessagePlainText(...a),
        getLastActiveSessionId: ctx.session.getLastActiveSessionId,
        bumpSessionIndex: ctx.session.bumpSessionIndex,
        resetSessionIndex: ctx.session.resetSessionIndex,
    });

    return {
        groupUtils,
        bindMessagesRef(ref) {
            messages = ref;
        },
        assignSessionIndex: groupUtils.assignSessionIndex,
        reindexSessionIndices: groupUtils.reindexSessionIndices,
        requestSessionExport: groupUtils.requestSessionExport,
    };
}
