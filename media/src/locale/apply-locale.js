import {
    messagesEl,
    inputEl,
    inputResizeHandle,
    sendBtn,
    tokenUsageRing,
    clearChatBtn,
    clearInputBtn,
    copySessionBtn,
    quickToggleBtn,
    chatSearchInput,
    chatSearchPrev,
    chatSearchNext,
    newChatBtn,
    multiSelectAllBtn,
    multiSelectDeleteBtn,
    multiSelectCopyBtn,
    multiSelectExportBtn,
    multiSelectExitBtn,
    multiSelectAttachConfirmBtn,
    statusText,
    contextAttachHeaderLead,
    contextAttachHeaderRest,
    contextAttachHelp,
    contextAttachTooltipEl,
    SESSION_RENDER_BANNER_ID,
} from '../core/dom-refs.js';
import {
    DETECT_STEP_IDS,
    detectStepLabel,
    refreshDetectStepLabels,
} from '../detect-environment/steps.js';
import {
    detectEnvDetailsOpen,
    detectEnvPanelReady,
    setDetectEnvDetailsTitle,
} from '../detect-environment/toolbar.js';
import {
    configureEnvDetectSteps,
    configureEnvDetectToggle,
    configureEnvPathInput,
    configureEnvPathClearBtn,
    configureEnvBrowseBtn,
    configureEnvDetectBtn,
    configureEnvSaveBtn,
    configureEnvSystemBtn,
    configureEnvDetectDetailsOpen,
    configureEnvCandidatesEmpty,
    configureEnvCancelBtn,
    updateConfigureEnvPathClearVisibility,
    updateConfigureEnvSystemHint,
    setConfigureEnvDetectDetailsTitle,
} from '../configure-environment/index.js';

/** @param {Record<string, Function>} deps */
export function createApplyLocale(deps) {
    function applyLocale() {
        const locale = deps.getLocale();
        const toolbarStatus = document.getElementById('toolbarStatus');
        const retryBtnEl = document.getElementById('retryBtn');
        const profileBtnEl = document.getElementById('profileBtn');
        const modelBtnEl = document.getElementById('modelBtn');
        const cancelBtnEl = document.getElementById('cancelBtn');
        const filePickerElLocal = document.getElementById('filePicker');

        if (toolbarStatus) toolbarStatus.title = locale.connectionStatus;
        if (retryBtnEl) retryBtnEl.title = locale.retry;
        const detectEnvBtnEl = document.getElementById('detectEnvBtn');
        if (detectEnvBtnEl) {
            detectEnvBtnEl.textContent = locale.detectEnvironment || '';
            detectEnvBtnEl.title = locale.detectEnvironment || '';
        }
        const profileLabelText = document.getElementById('profileLabelText');
        if (profileLabelText) profileLabelText.textContent = locale.profile;
        if (profileBtnEl) profileBtnEl.title = locale.switchProfile;
        const profilesHeader = document.getElementById('profilesHeader');
        if (profilesHeader) profilesHeader.textContent = locale.profiles;
        if (modelBtnEl) modelBtnEl.title = locale.switchModel;
        const modelsHeader = document.getElementById('modelsHeader');
        if (modelsHeader) modelsHeader.textContent = locale.models;
        deps.refreshModelButtonDisplay();
        if (contextAttachHeaderLead) contextAttachHeaderLead.textContent = locale.contextAttachHeaderLead || '';
        if (contextAttachHeaderRest) contextAttachHeaderRest.textContent = locale.contextAttachHeaderRest || '';
        if (contextAttachHelp) {
            const tip = locale.contextAttachTooltip || '';
            contextAttachHelp.title = tip;
            contextAttachHelp.setAttribute('aria-label', tip);
        }
        if (contextAttachTooltipEl) {
            contextAttachTooltipEl.textContent = locale.contextAttachTooltip || '';
        }
        const contextAttachSendTitle = document.getElementById('contextAttachSendModalTitle');
        const contextAttachSendBody = document.getElementById('contextAttachSendModalBody');
        const contextAttachSendYesBtn = document.getElementById('contextAttachSendYesBtn');
        const contextAttachSendNoBtn = document.getElementById('contextAttachSendNoBtn');
        if (contextAttachSendTitle) contextAttachSendTitle.textContent = locale.contextAttachCustom || '';
        if (contextAttachSendBody) contextAttachSendBody.textContent = locale.contextAttachSendPrompt || '';
        if (contextAttachSendYesBtn) contextAttachSendYesBtn.textContent = locale.contextAttachSendYes || '';
        if (contextAttachSendNoBtn) contextAttachSendNoBtn.textContent = locale.contextAttachSendNo || '';
        if (multiSelectAttachConfirmBtn) multiSelectAttachConfirmBtn.textContent = locale.contextAttachConfirm || '';
        deps.updateContextAttachButtonLabel();
        deps.renderContextAttachOptions();
        const newChatLabelFull = document.getElementById('newChatLabelFull');
        if (newChatLabelFull) newChatLabelFull.textContent = locale.newChatBtn;
        if (newChatBtn) newChatBtn.title = locale.newChatBtn;
        const detectEnvClose = document.getElementById('detectEnvClose');
        if (detectEnvClose) {
            detectEnvClose.title = locale.detectEnvironmentClose || '';
            detectEnvClose.setAttribute('aria-label', locale.detectEnvironmentClose || 'Close');
        }
        if (detectEnvPanelReady) {
            setDetectEnvDetailsTitle();
            const toggle = document.getElementById('detectEnvToggle');
            if (toggle) {
                toggle.title = detectEnvDetailsOpen
                    ? (locale.detectEnvironmentHideDetails || '')
                    : (locale.detectEnvironmentViewDetails || '');
            }
            const hint = document.getElementById('detectEnvCompactHint');
            if (hint) hint.classList.toggle('is-open', detectEnvDetailsOpen);
            DETECT_STEP_IDS.forEach(function(stepId) {
                const row = document.getElementById('detectStep-' + stepId);
                if (!row) return;
                const label = row.querySelector('.detect-env-step-label');
                if (label) label.textContent = detectStepLabel(stepId);
            });
        }
        if (inputResizeHandle) {
            inputResizeHandle.title = locale.resizeHandle;
            inputResizeHandle.setAttribute('aria-label', locale.resizeHandle);
        }
        if (filePickerElLocal) filePickerElLocal.setAttribute('aria-label', locale.filePicker);
        if (chatSearchInput) {
            chatSearchInput.placeholder = locale.searchChat;
            chatSearchInput.setAttribute('aria-label', locale.searchChat);
        }
        if (chatSearchPrev) {
            chatSearchPrev.title = locale.searchPrev;
            chatSearchPrev.setAttribute('aria-label', locale.searchPrev);
        }
        if (chatSearchNext) {
            chatSearchNext.title = locale.searchNext;
            chatSearchNext.setAttribute('aria-label', locale.searchNext);
        }
        if (clearChatBtn) {
            clearChatBtn.title = locale.clearChat;
            clearChatBtn.setAttribute('aria-label', locale.clearChat);
        }
        if (clearInputBtn) {
            clearInputBtn.title = locale.clearInput;
            clearInputBtn.setAttribute('aria-label', locale.clearInput);
        }
        if (copySessionBtn) {
            copySessionBtn.title = locale.copySession;
            copySessionBtn.setAttribute('aria-label', locale.copySession);
        }
        if (multiSelectAllBtn) multiSelectAllBtn.textContent = locale.multiSelectAll;
        if (multiSelectDeleteBtn) multiSelectDeleteBtn.textContent = locale.multiSelectDelete;
        if (multiSelectCopyBtn) multiSelectCopyBtn.textContent = locale.multiSelectCopy;
        if (multiSelectExportBtn) multiSelectExportBtn.textContent = locale.multiSelectExport;
        if (multiSelectExitBtn) multiSelectExitBtn.textContent = locale.multiSelectExit;
        deps.updateMultiSelectToolbar();
        if (quickToggleBtn) {
            quickToggleBtn.title = locale.quickActions;
            quickToggleBtn.setAttribute('aria-label', locale.quickActions);
        }
        if (inputEl) inputEl.placeholder = locale.inputPlaceholder;
        if (tokenUsageRing) {
            tokenUsageRing.title = locale.tokenUsage;
            tokenUsageRing.setAttribute('aria-label', locale.tokenUsage);
        }
        if (sendBtn) sendBtn.textContent = locale.send;
        const stopBtnLabel = document.getElementById('stopBtnLabel');
        if (stopBtnLabel) stopBtnLabel.textContent = locale.stop;
        if (cancelBtnEl) {
            cancelBtnEl.title = locale.cancelResponse;
            cancelBtnEl.setAttribute('aria-label', locale.cancelResponse);
        }
        const logModalTitle = document.getElementById('logModalTitle');
        if (logModalTitle) logModalTitle.textContent = locale.hermesLogs;
        const renderBannerText = document.querySelector('#' + SESSION_RENDER_BANNER_ID + ' .session-render-text');
        if (renderBannerText) renderBannerText.textContent = locale.sessionRendering || '';
        const copyLogBtn = document.getElementById('copyLogBtn');
        if (copyLogBtn) copyLogBtn.textContent = locale.copy;
        const clearLogBtn = document.getElementById('clearLogBtn');
        if (clearLogBtn) clearLogBtn.textContent = locale.clear;
        deps.applyInfoModalLocale();
        const configureEnvModalTitle = document.getElementById('configureEnvModalTitle');
        if (configureEnvModalTitle) configureEnvModalTitle.textContent = locale.configureEnvironmentTitle || '';
        const configureEnvPathLabel = document.getElementById('configureEnvPathLabel');
        if (configureEnvPathLabel) configureEnvPathLabel.textContent = locale.configureEnvironmentPathLabel || '';
        if (configureEnvPathInput) {
            configureEnvPathInput.placeholder = locale.configureEnvironmentPathPlaceholder || '';
        }
        if (configureEnvPathClearBtn) {
            configureEnvPathClearBtn.setAttribute(
                'aria-label',
                locale.configureEnvironmentClearPath || 'Clear path',
            );
            configureEnvPathClearBtn.title = locale.configureEnvironmentClearPath || 'Clear path';
        }
        updateConfigureEnvPathClearVisibility();
        if (configureEnvBrowseBtn) configureEnvBrowseBtn.textContent = locale.configureEnvironmentBrowse || '';
        if (configureEnvDetectBtn) configureEnvDetectBtn.textContent = locale.configureEnvironmentDetect || '';
        const configureEnvCandidatesTitle = document.getElementById('configureEnvCandidatesTitle');
        if (configureEnvCandidatesTitle) {
            configureEnvCandidatesTitle.textContent = locale.configureEnvironmentCandidatesTitle || '';
        }
        if (configureEnvCandidatesEmpty) {
            configureEnvCandidatesEmpty.textContent = locale.configureEnvironmentNoCandidates || '';
        }
        if (configureEnvSaveBtn) configureEnvSaveBtn.textContent = locale.configureEnvironmentSave || '';
        if (configureEnvCancelBtn) configureEnvCancelBtn.textContent = locale.configureEnvironmentCancel || '';
        if (configureEnvSystemBtn) {
            configureEnvSystemBtn.textContent = locale.detectEnvironmentConfigureSystem || '';
        }
        updateConfigureEnvSystemHint();
        refreshDetectStepLabels(configureEnvDetectSteps, 'configureDetectStep-');
        setConfigureEnvDetectDetailsTitle();
        if (configureEnvDetectToggle) {
            configureEnvDetectToggle.title = configureEnvDetectDetailsOpen
                ? (locale.detectEnvironmentHideDetails || '')
                : (locale.detectEnvironmentViewDetails || '');
        }
        if (statusText) statusText.textContent = locale.statusDisconnected;
        deps.refreshAllPermissionLocale();
        deps.refreshAllAuxiliaryLocale();
    }

    return { applyLocale };
}
