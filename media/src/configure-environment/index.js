import { getLocale } from '../core/locale.js';
import { vscode } from '../core/vscode.js';
import { escapeHtml } from '../utils/escape-html.js';
import { basenameFromPath } from '../utils/path.js';
import {
    ensureDetectStepsList,
    formatDetectProgressDisplay,
    resetDetectStepsList,
    setDetectEnvIcon,
    updateDetectStepsList,
} from '../detect-environment/steps.js';

export const configureEnvModal = document.getElementById('configureEnvModal');
export const configureEnvPathInput = document.getElementById('configureEnvPathInput');
export const configureEnvPathClearBtn = document.getElementById('configureEnvPathClearBtn');
export const configureEnvBrowseBtn = document.getElementById('configureEnvBrowseBtn');
export const configureEnvDetectBtn = document.getElementById('configureEnvDetectBtn');
export const configureEnvDetectSection = document.getElementById('configureEnvDetectSection');
export const configureEnvDetectCompactIcon = document.getElementById('configureEnvDetectCompactIcon');
export const configureEnvDetectCompactText = document.getElementById('configureEnvDetectCompactText');
export const configureEnvDetectCompactHint = document.getElementById('configureEnvDetectCompactHint');
export const configureEnvDetectToggle = document.getElementById('configureEnvDetectToggle');
export const configureEnvDetectClose = document.getElementById('configureEnvDetectClose');
export const configureEnvDetectDetails = document.getElementById('configureEnvDetectDetails');
export const configureEnvDetectDetailsTitle = document.getElementById('configureEnvDetectDetailsTitle');
export const configureEnvDetectSteps = document.getElementById('configureEnvDetectSteps');
export const configureEnvCandidatesSection = document.getElementById('configureEnvCandidatesSection');
export const configureEnvCandidatesList = document.getElementById('configureEnvCandidatesList');
export const configureEnvCandidatesEmpty = document.getElementById('configureEnvCandidatesEmpty');
export const configureEnvSaveBtn = document.getElementById('configureEnvSaveBtn');
export const configureEnvCancelBtn = document.getElementById('configureEnvCancelBtn');
export const configureEnvSystemBtn = document.getElementById('configureEnvSystemBtn');
export const configureEnvSystemHint = document.getElementById('configureEnvSystemHint');
export const configureEnvCloseBtn = document.getElementById('configureEnvCloseBtn');
export let configureEnvSelectedPath = '';
export let configureEnvDetectFinished = false;
export let configureEnvDetectDetailsOpen = false;
export let configureEnvDetectPanelVisible = false;
export let configureEnvSystemVar = 'PATH';
export let configureEnvSystemTarget = '';

export function showConfigureEnvDetectPanel() {
    configureEnvDetectPanelVisible = true;
    if (configureEnvDetectSection) configureEnvDetectSection.hidden = false;
}

export function updateConfigureEnvPathClearVisibility() {
    if (!configureEnvPathClearBtn || !configureEnvPathInput) return;
    const hasValue = !!configureEnvPathInput.value.trim();
    configureEnvPathClearBtn.hidden = !hasValue;
}

export function clearConfigureEnvPath() {
    if (!configureEnvPathInput) return;
    configureEnvPathInput.value = '';
    configureEnvSelectedPath = '';
    updateConfigureEnvPathClearVisibility();
    if (configureEnvCandidatesList) {
        configureEnvCandidatesList.querySelectorAll('.configure-env-candidate-row').forEach(function(el) {
            el.classList.remove('is-selected');
        });
    }
    configureEnvPathInput.focus();
}

export function hideConfigureEnvDetectProgress() {
    configureEnvDetectPanelVisible = false;
    configureEnvDetectFinished = false;
    configureEnvDetectDetailsOpen = false;
    if (configureEnvDetectSection) configureEnvDetectSection.hidden = true;
    setConfigureEnvDetectDetailsOpen(false);
    resetDetectStepsList('configureDetectStep-');
    if (configureEnvDetectCompactText) {
        configureEnvDetectCompactText.textContent = '';
        configureEnvDetectCompactText.title = '';
    }
    setDetectEnvIcon(configureEnvDetectCompactIcon, 'running');
}

export function hideConfigureEnvDetectPanel() {
    hideConfigureEnvDetectProgress();
    if (configureEnvCandidatesSection) {
        configureEnvCandidatesSection.hidden = true;
        configureEnvCandidatesSection.classList.remove('is-visible');
    }
    if (configureEnvCandidatesList) configureEnvCandidatesList.textContent = '';
    if (configureEnvCandidatesEmpty) configureEnvCandidatesEmpty.hidden = true;
}

export function closeConfigureEnvDetectPanel() {
    const wasVisible = configureEnvDetectPanelVisible;
    hideConfigureEnvDetectProgress();
    if (wasVisible) {
        setConfigureEnvDetecting(false);
        vscode.postMessage({ type: 'configureEnvironmentDetectClose' });
    }
}

export function createConfigureEnvFolderIcon() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('aria-hidden', 'true');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M2 4.5h4.5L8 6h6v7.5H2z');
    svg.appendChild(path);
    return svg;
}

export function setConfigureEnvDetectDetailsOpen(open) {
    configureEnvDetectDetailsOpen = !!open;
    if (configureEnvDetectDetails) configureEnvDetectDetails.hidden = !configureEnvDetectDetailsOpen;
    if (configureEnvDetectCompactHint) {
        configureEnvDetectCompactHint.classList.toggle('is-open', configureEnvDetectDetailsOpen);
    }
    if (configureEnvDetectToggle) {
        configureEnvDetectToggle.setAttribute('aria-expanded', configureEnvDetectDetailsOpen ? 'true' : 'false');
        configureEnvDetectToggle.title = configureEnvDetectDetailsOpen
            ? (getLocale().detectEnvironmentHideDetails || '')
            : (getLocale().detectEnvironmentViewDetails || '');
    }
}

export function setConfigureEnvDetectDetailsTitle() {
    if (!configureEnvDetectDetailsTitle) return;
    configureEnvDetectDetailsTitle.textContent = configureEnvDetectFinished
        ? (getLocale().detectEnvironmentCompleteTitle || getLocale().detectEnvironmentStepSummary || '')
        : (getLocale().detectEnvironmentDetectTitle || getLocale().detectEnvironment || '');
}

export function updateConfigureEnvSystemHint() {
    if (!configureEnvSystemHint) return;
    const hint = localeText(
        'configureEnvironmentSystemVarHint',
        configureEnvSystemVar || 'PATH',
        configureEnvSystemTarget || '',
    );
    configureEnvSystemHint.innerHTML = hint.replace(
        configureEnvSystemVar,
        '<code>' + escapeHtml(configureEnvSystemVar) + '</code>',
    );
    if (configureEnvSystemBtn) {
        configureEnvSystemBtn.title = localeText(
            'detectEnvironmentConfigureSystemDesc',
            configureEnvSystemVar || 'PATH',
            configureEnvSystemTarget || '',
        );
    }
}

export function setConfigureEnvDetecting(detecting) {
    if (configureEnvBrowseBtn) configureEnvBrowseBtn.disabled = !!detecting;
    if (configureEnvDetectBtn) configureEnvDetectBtn.disabled = !!detecting;
    if (configureEnvSaveBtn) configureEnvSaveBtn.disabled = !!detecting;
    if (configureEnvSystemBtn) configureEnvSystemBtn.disabled = !!detecting;
}

export function resetConfigureEnvDetectPanel() {
    hideConfigureEnvDetectPanel();
    configureEnvSelectedPath = '';
}

export function openConfigureEnvModal(currentPath, systemEnvVar, systemEnvTarget) {
    if (!configureEnvModal) return;
    configureEnvSystemVar = systemEnvVar || 'PATH';
    configureEnvSystemTarget = systemEnvTarget || '';
    updateConfigureEnvSystemHint();
    resetConfigureEnvDetectPanel();
    if (configureEnvPathInput) configureEnvPathInput.value = currentPath || '';
    updateConfigureEnvPathClearVisibility();
    configureEnvModal.classList.add('is-open');
    if (configureEnvPathInput) configureEnvPathInput.focus();
}

export function closeConfigureEnvModal() {
    if (!configureEnvModal) return;
    configureEnvModal.classList.remove('is-open');
    resetConfigureEnvDetectPanel();
}

export function initConfigureEnvDetectStart() {
    configureEnvDetectFinished = false;
    ensureDetectStepsList(configureEnvDetectSteps, 'configureDetectStep-');
    resetDetectStepsList('configureDetectStep-');
    showConfigureEnvDetectPanel();
    setConfigureEnvDetectDetailsOpen(false);
    setConfigureEnvDetectDetailsTitle();
    if (configureEnvDetectToggle) {
        configureEnvDetectToggle.title = getLocale().detectEnvironmentViewDetails || '';
    }
    setDetectEnvIcon(configureEnvDetectCompactIcon, 'running');
    if (configureEnvDetectCompactText) {
        const text = formatDetectProgressDisplay('0%');
        configureEnvDetectCompactText.textContent = text;
        configureEnvDetectCompactText.title = text;
    }
}

export function updateConfigureEnvDetectProgress(msg) {
    if (!configureEnvDetectSection || !configureEnvDetectPanelVisible) return;
    updateDetectStepsList(
        msg,
        'configureDetectStep-',
        configureEnvDetectCompactIcon,
        configureEnvDetectCompactText,
    );
}



export function selectConfigureEnvCandidate(path, rowEl) {
    configureEnvSelectedPath = path || '';
    if (configureEnvPathInput) {
        configureEnvPathInput.value = configureEnvSelectedPath;
        updateConfigureEnvPathClearVisibility();
    }
    if (configureEnvCandidatesList) {
        configureEnvCandidatesList.querySelectorAll('.configure-env-candidate-row').forEach(function(el) {
            el.classList.toggle('is-selected', el === rowEl);
        });
    }
}

export function renderConfigureEnvCandidates(executables) {
    if (!configureEnvCandidatesSection || !configureEnvCandidatesList || !configureEnvCandidatesEmpty) return;
    configureEnvCandidatesList.textContent = '';
    const list = Array.isArray(executables) ? executables : [];
    configureEnvCandidatesSection.hidden = false;
    configureEnvCandidatesSection.classList.remove('is-visible');
    void configureEnvCandidatesSection.offsetWidth;
    configureEnvCandidatesSection.classList.add('is-visible');
    if (list.length === 0) {
        configureEnvCandidatesEmpty.hidden = false;
        configureEnvCandidatesEmpty.textContent = getLocale().configureEnvironmentNoCandidates || '';
        return;
    }
    configureEnvCandidatesEmpty.hidden = true;
    list.forEach(function(item, index) {
        const li = document.createElement('li');
        li.className = 'configure-env-candidate-row';
        if (item.path === configureEnvSelectedPath) {
            li.classList.add('is-selected');
        }
        li.style.animationDelay = (index * 0.06) + 's';

        const body = document.createElement('div');
        body.className = 'configure-env-candidate-body';
        const icon = document.createElement('span');
        icon.className = 'configure-env-candidate-icon detect-env-icon ' + (item.verified ? 'ok' : 'fail');
        const main = document.createElement('div');
        main.className = 'configure-env-candidate-main';
        const head = document.createElement('div');
        head.className = 'configure-env-candidate-head';
        const name = document.createElement('span');
        name.className = 'configure-env-candidate-name';
        name.textContent = basenameFromPath(item.path);
        const badge = document.createElement('span');
        badge.className = 'configure-env-candidate-badge ' + (item.verified ? 'is-verified' : 'is-unverified');
        badge.textContent = item.verified
            ? (getLocale().detectEnvironmentCandidateVerified || 'verified')
            : (getLocale().detectEnvironmentCandidateUnverified || 'unverified');
        const tag = document.createElement('span');
        tag.className = 'configure-env-candidate-tag';
        tag.textContent = item.source || '';
        head.appendChild(name);
        head.appendChild(badge);
        if (item.source) head.appendChild(tag);
        const pathEl = document.createElement('div');
        pathEl.className = 'configure-env-candidate-path';
        pathEl.textContent = item.path || '';
        main.appendChild(head);
        main.appendChild(pathEl);
        if (item.version) {
            const versionEl = document.createElement('div');
            versionEl.className = 'configure-env-candidate-version';
            versionEl.textContent = item.version;
            main.appendChild(versionEl);
        }
        body.appendChild(icon);
        body.appendChild(main);
        body.addEventListener('click', function() {
            selectConfigureEnvCandidate(item.path || '', li);
        });

        const actions = document.createElement('div');
        actions.className = 'configure-env-candidate-actions';

        const openBtn = document.createElement('button');
        openBtn.type = 'button';
        openBtn.className = 'configure-env-candidate-open';
        openBtn.title = getLocale().configureEnvironmentOpenDirectory || 'Open folder';
        openBtn.setAttribute('aria-label', openBtn.title);
        openBtn.appendChild(createConfigureEnvFolderIcon());
        openBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (!item.path) return;
            vscode.postMessage({
                type: 'configureEnvironmentOpenDirectory',
                path: item.path,
            });
        });

        const selectBtn = document.createElement('button');
        selectBtn.type = 'button';
        selectBtn.className = 'configure-env-candidate-select';
        selectBtn.setAttribute('aria-label', getLocale().configureEnvironmentSelectCandidate || 'Select');
        selectBtn.textContent = '✓';
        selectBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectConfigureEnvCandidate(item.path || '', li);
        });

        actions.appendChild(openBtn);
        actions.appendChild(selectBtn);

        li.appendChild(body);
        li.appendChild(actions);
        configureEnvCandidatesList.appendChild(li);
    });
}

export function finishConfigureEnvDetect(msg) {
    setConfigureEnvDetecting(false);
    if (msg.status === 'cancelled' || !configureEnvDetectPanelVisible) {
        hideConfigureEnvDetectProgress();
        return;
    }
    configureEnvDetectFinished = true;
    setConfigureEnvDetectDetailsTitle();
    const summaryStatus = msg.status === 'ready' ? 'ok' : (msg.executables && msg.executables.length ? 'ok' : 'fail');
    updateConfigureEnvDetectProgress({
        step: 'summary',
        status: summaryStatus,
        reportStatus: msg.status,
        brief: '100%',
        detail: msg.summary,
    });
    renderConfigureEnvCandidates(msg.executables || []);
}

export function startConfigureEnvDetect() {
    if (!configureEnvDetectBtn || configureEnvDetectBtn.disabled) return;
    if (configureEnvCandidatesSection) {
        configureEnvCandidatesSection.hidden = true;
        configureEnvCandidatesSection.classList.remove('is-visible');
    }
    if (configureEnvCandidatesList) configureEnvCandidatesList.textContent = '';
    if (configureEnvCandidatesEmpty) configureEnvCandidatesEmpty.hidden = true;
    configureEnvSelectedPath = configureEnvPathInput ? configureEnvPathInput.value.trim() : '';
    setConfigureEnvDetecting(true);
    initConfigureEnvDetectStart();
    vscode.postMessage({
        type: 'configureEnvironmentDetect',
        currentPath: configureEnvPathInput ? configureEnvPathInput.value.trim() : '',
    });
}

export function saveConfigureEnvPath() {
    if (!configureEnvSaveBtn || configureEnvSaveBtn.disabled) return;
    vscode.postMessage({
        type: 'configureEnvironmentSave',
        path: configureEnvPathInput ? configureEnvPathInput.value.trim() : '',
    });
}

export function browseConfigureEnvPath() {
    if (!configureEnvBrowseBtn || configureEnvBrowseBtn.disabled) return;
    vscode.postMessage({ type: 'configureEnvironmentBrowse' });
}

export function requestConfigureEnvSystemPath() {
    if (!configureEnvSystemBtn || configureEnvSystemBtn.disabled) return;
    vscode.postMessage({
        type: 'configureEnvironmentSystem',
        path: configureEnvPathInput ? configureEnvPathInput.value.trim() : '',
    });
}

export function bindConfigureEnvEvents() {
    if (configureEnvBrowseBtn) configureEnvBrowseBtn.addEventListener('click', browseConfigureEnvPath);
    if (configureEnvDetectBtn) configureEnvDetectBtn.addEventListener('click', startConfigureEnvDetect);
    if (configureEnvDetectClose) {
        configureEnvDetectClose.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            closeConfigureEnvDetectPanel();
        });
    }
    if (configureEnvPathClearBtn) {
        configureEnvPathClearBtn.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            clearConfigureEnvPath();
        });
    }
    if (configureEnvPathInput) {
        configureEnvPathInput.addEventListener('input', function() {
            configureEnvSelectedPath = configureEnvPathInput.value.trim();
            updateConfigureEnvPathClearVisibility();
        });
    }
    if (configureEnvDetectToggle) {
        configureEnvDetectToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            setConfigureEnvDetectDetailsOpen(!configureEnvDetectDetailsOpen);
        });
    }
    if (configureEnvSaveBtn) configureEnvSaveBtn.addEventListener('click', saveConfigureEnvPath);
    if (configureEnvCancelBtn) configureEnvCancelBtn.addEventListener('click', closeConfigureEnvModal);
    if (configureEnvCloseBtn) configureEnvCloseBtn.addEventListener('click', closeConfigureEnvModal);
    if (configureEnvSystemBtn) configureEnvSystemBtn.addEventListener('click', requestConfigureEnvSystemPath);
    if (configureEnvModal) {
        configureEnvModal.addEventListener('click', function(e) {
            if (e.target === configureEnvModal) closeConfigureEnvModal();
        });
    }
}

export function applyConfigureEnvBrowsePath(path) {
    if (!configureEnvPathInput) return;
    configureEnvPathInput.value = path;
    configureEnvSelectedPath = path;
    updateConfigureEnvPathClearVisibility();
}

