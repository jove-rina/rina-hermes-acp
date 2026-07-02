import {
    finishDetectEnvironmentPanel,
    initDetectEnvironmentStart,
    updateDetectEnvironmentStep,
} from '../../detect-environment/toolbar.js';
import { setDetectEnvIcon } from '../../detect-environment/steps.js';
import {
    applyConfigureEnvBrowsePath,
    closeConfigureEnvModal,
    configureEnvDetectCompactIcon,
    configureEnvDetectCompactText,
    finishConfigureEnvDetect,
    hideConfigureEnvDetectProgress,
    openConfigureEnvModal,
    setConfigureEnvDetecting,
    showConfigureEnvDetectPanel,
    updateConfigureEnvDetectProgress,
} from '../../configure-environment/index.js';

/** @param {{ placeholder: HTMLElement | null }} deps */
export function createEnvironmentHandlers(deps) {
    return {
        detectEnvironmentStart(msg) {
            initDetectEnvironmentStart(msg.mode || 'manual');
            if (deps.placeholder) deps.placeholder.style.display = 'none';
        },
        detectEnvironmentProgress(msg) {
            updateDetectEnvironmentStep(msg);
        },
        detectEnvironmentEnd(msg) {
            finishDetectEnvironmentPanel(msg);
        },
        configureEnvironmentOpen(msg) {
            openConfigureEnvModal(msg.currentPath || '', msg.systemEnvVar, msg.systemEnvTarget);
        },
        configureEnvironmentDetectStart() {
            setConfigureEnvDetecting(true);
        },
        configureEnvironmentDetectProgress(msg) {
            updateConfigureEnvDetectProgress(msg);
        },
        configureEnvironmentDetectEnd(msg) {
            finishConfigureEnvDetect(msg);
        },
        configureEnvironmentDetectClosed() {
            hideConfigureEnvDetectProgress();
            setConfigureEnvDetecting(false);
        },
        configureEnvironmentBrowseResult(msg) {
            if (msg.path) {
                applyConfigureEnvBrowsePath(msg.path);
            } else if (msg.error && configureEnvDetectCompactText) {
                showConfigureEnvDetectPanel();
                configureEnvDetectCompactText.textContent = msg.error;
                setDetectEnvIcon(configureEnvDetectCompactIcon, 'fail');
            }
        },
        configureEnvironmentSaveResult(msg) {
            if (msg.ok) {
                closeConfigureEnvModal();
            } else if (msg.error && configureEnvDetectCompactText) {
                showConfigureEnvDetectPanel();
                configureEnvDetectCompactText.textContent = msg.error;
                setDetectEnvIcon(configureEnvDetectCompactIcon, 'fail');
            }
        },
    };
}

