/** @param {Record<string, Function>} deps */
export function createUiHandlers(deps) {
    return {
        status(msg) {
            if (!deps.isMessageForActiveSession(msg)) {
                return;
            }
            if (msg.status === 'connecting') {
                deps.setConnectionAttempted(true);
            }
            deps.updateStatus(msg.status, msg.message);
            if (msg.status === 'ready') {
                deps.setIsPrompting(false);
                deps.setAwaitingFirstChunk(false);
                deps.resetToolAggregation();
                deps.finishStreaming();
                deps.setCanSend(true);
                deps.inputEl.disabled = false;
                deps.setInputMode('send');
                deps.placeholder.style.display = 'none';
                if (!window._hermesRendered) {
                    deps.scheduleSessionMarkdownRender();
                }
                deps.maybeFocusInputAfterResponse();
            } else if (msg.status === 'prompting') {
                deps.setIsPrompting(true);
                deps.resetAutoScrollFollow();
                deps.setCanSend(false);
                deps.inputEl.disabled = true;
                if (!deps.getAwaitingFirstChunk()) {
                    deps.setInputMode('stop');
                }
            } else if (msg.status === 'error') {
                deps.setIsPrompting(false);
                deps.setAwaitingFirstChunk(false);
                deps.setCanSend(false);
                deps.inputEl.disabled = true;
                deps.finishStreaming();
                deps.setInputMode('disabled');
                deps.updateTokenUsage(0, 0);
                const locale = deps.getLocale();
                const errText = msg.message || locale.connectionError;
                deps.placeholder.innerHTML = deps.buildConnectionErrorPlaceholder(errText);
                deps.bindConnectionErrorActions();
                deps.placeholder.style.display = 'block';
            } else if (msg.status === 'idle') {
                deps.setIsPrompting(false);
                deps.setAwaitingFirstChunk(false);
                deps.setCanSend(false);
                deps.inputEl.disabled = true;
                deps.finishStreaming();
                deps.setInputMode('disabled');
                deps.updateTokenUsage(0, 0);
            }
        },
        setLocale(msg) {
            if (!msg.locale) return;
            deps.setLocale(msg.locale);
            deps.refreshLocale();
            if (deps.getLastSessions().length > 0) {
                deps.renderSessionTabs(deps.getLastSessions(), deps.getLastActiveSessionId());
            }
            const divider = document.getElementById(deps.LOCAL_HISTORY_DIVIDER_ID);
            if (divider) {
                const locale = deps.getLocale();
                divider.textContent = locale.localHistoryDivider || '';
                divider.title = locale.localHistoryDividerTitle || '';
            }
        },
        sessionExport(msg) {
            if (msg.action === 'copy' && msg.markdown) {
                deps.copyToClipboard(msg.markdown);
            } else if (msg.action === 'export' && msg.markdown) {
                deps.downloadSessionMarkdown(msg.markdown, msg.filename);
            }
        },
        agentList(msg) {
            deps.renderProfileList(msg.agents || msg.profiles);
        },
        profileList(msg) {
            deps.renderProfileList(msg.agents || msg.profiles);
        },
        modelList(msg) {
            deps.renderModelList(msg);
        },
        log(msg) {
            if (msg.level === 'error' || msg.level === 'warning') {
                deps.appendLog(msg.line, msg.level);
            }
        },
        config(msg) {
            window._showThoughts = msg.showThoughts;
            window._showToolCalls = msg.showToolCalls;
            document.querySelectorAll('.message-group.thought').forEach(function(el) {
                el.style.display = msg.showThoughts ? '' : 'none';
            });
            document.querySelectorAll('.message-group.tool').forEach(function(el) {
                el.style.display = msg.showToolCalls ? '' : 'none';
            });
        },
        activeAgent(msg) {
            if (msg.name) {
                document.getElementById('profileLabel').textContent = msg.name;
            }
        },
        activeProfile(msg) {
            if (msg.name) {
                document.getElementById('profileLabel').textContent = msg.name;
            }
        },
        pluginInfo(msg) {
            deps.setPluginInfo(msg);
            deps.renderAboutContent();
        },
        fileList(msg) {
            if (deps.getFilePickerRequestId() === msg.requestId) {
                deps.renderFilePickerItems(msg.files || []);
            }
        },
        filePreview(msg) {
            if (deps.previewRequests.has(msg.requestId)) {
                const anchor = deps.previewRequests.get(msg.requestId);
                deps.previewRequests.delete(msg.requestId);
                deps.showFilePreview(msg.path || '', msg.content, msg.error);
                deps.positionFilePreview(anchor);
            }
        },
        showContextAttach() {
            deps.showContextAttachPicker();
        },
        hideContextAttach() {
            deps.hideContextAttachPicker();
        },
        markSessionReset() {
            deps.insertLocalHistoryDivider();
        },
    };
}
