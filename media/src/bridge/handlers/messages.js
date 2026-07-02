/** @param {Record<string, Function>} deps */
export function createMessageHandlers(deps) {
    return {
        addMessage(msg) {
            if (!deps.isMessageForActiveSession(msg)) {
                return;
            }
            if (msg.role === 'assistant') {
                deps.addMessage('assistant', msg.text);
            } else if (msg.role === 'tool' && msg.toolCallId) {
                deps.handleToolMessage(msg.text, msg.toolCallId);
            } else if (msg.role === 'thought') {
                if (deps.getThoughtMsgId()) {
                    const el = document.getElementById(deps.getThoughtMsgId());
                    if (el) {
                        deps.setAuxiliaryContent(el, msg.text);
                        deps.setAuxMessageLive(el, true);
                        deps.maybeScrollToBottom();
                        return;
                    }
                }
                const id = deps.addMessage('thought', msg.text);
                deps.setThoughtMsgId(id);
            } else {
                deps.addMessage(msg.role, msg.text);
            }
        },
        restoreHistory(msg) {
            deps.restoreHistory(msg.messages, msg.localHistoryOnly);
        },
        finishAssistantBubble(msg) {
            if (!deps.isMessageForActiveSession(msg)) {
                return;
            }
            deps.finalizeAssistantBubble();
            if (deps.getIsPrompting() && !deps.getAwaitingFirstChunk()) {
                deps.setInputMode('stop');
            }
        },
        permissionRequest(msg) {
            deps.showPermissionRequest(msg);
        },
        permissionUpdate(msg) {
            if (msg.id && deps.pendingPermissions.has(msg.id)) {
                deps.updatePermissionContent(
                    deps.pendingPermissions.get(msg.id),
                    msg.title,
                    msg.detail
                );
            }
        },
        permissionDismiss(msg) {
            deps.dismissPermissionRequest(msg.id, msg.status || deps.getLocale().permissionCancelled);
        },
    };
}
