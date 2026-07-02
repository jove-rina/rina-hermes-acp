import { getLocale } from '../core/locale.js';

export const DETECT_STEP_IDS = [
    'config', 'path_lookup', 'known_path', 'pip', 'python_import', 'hermes_home', 'verify', 'acp_check', 'acp_install', 'summary',
];
export const DETECT_STEP_LOCALE_KEYS = {
    config: 'detectEnvironmentStepConfig',
    path_lookup: 'detectEnvironmentStepPath',
    known_path: 'detectEnvironmentStepKnownPath',
    pip: 'detectEnvironmentStepPip',
    python_import: 'detectEnvironmentStepPython',
    hermes_home: 'detectEnvironmentStepHermesHome',
    verify: 'detectEnvironmentStepVerify',
    acp_check: 'detectEnvironmentStepAcpCheck',
    acp_install: 'detectEnvironmentStepAcpInstall',
    summary: 'detectEnvironmentStepSummary',
};
export function detectStepLabel(stepId) {
    const key = DETECT_STEP_LOCALE_KEYS[stepId];
    return key ? (getLocale()[key] || stepId) : stepId;
}

export function formatDetectStepDetail(msg) {
    if (msg.status === 'running') return '…';
    if (msg.status === 'skip') return getLocale().detectEnvironmentStepSkipped || 'Skipped';
    if (msg.step === 'verify') {
        return localeText(
            'detectEnvironmentStepVerifyCount',
            msg.verifiedCount != null ? msg.verifiedCount : 0,
            msg.totalCount != null ? msg.totalCount : 0,
        );
    }
    if (msg.step === 'acp_check') {
        if (msg.status === 'ok') return msg.detail || getLocale().detectEnvironmentStepAcpOk || '';
        if (msg.status === 'fail') return msg.detail || getLocale().detectEnvironmentStepAcpFail || '';
    }
    if (msg.step === 'acp_install') {
        if (msg.status === 'ok') return msg.detail || getLocale().detectEnvironmentStepAcpInstallOk || '';
        if (msg.status === 'fail') return msg.detail || getLocale().detectEnvironmentStepAcpInstallFail || '';
    }
    if (msg.step === 'summary') {
        if (msg.detail) return msg.detail;
        if (msg.reportStatus === 'ready') return getLocale().detectEnvironmentSummaryReady || '';
        if (msg.reportStatus === 'broken') return getLocale().detectEnvironmentSummaryBroken || '';
        return getLocale().detectEnvironmentSummaryInstall || getLocale().detectEnvironmentSummaryNotFound || '';
    }
    if (msg.count > 0) {
        const summary = localeText('detectEnvironmentStepFoundCount', msg.count);
        if (msg.detail) return summary + '\n' + msg.detail;
        return summary;
    }
    if (msg.status === 'fail' && msg.detail) return msg.detail;
    return getLocale().detectEnvironmentStepNotFound || 'Not found';
}

export function setDetectEnvIcon(el, status) {
    if (!el) return;
    const keepStep = el.classList.contains('detect-env-step-icon');
    el.className = (keepStep ? 'detect-env-step-icon ' : '') + 'detect-env-icon ' + (status || 'running');
    el.textContent = '';
}

export function formatDetectProgressDisplay(brief) {
    if (!brief) return '';
    return localeText('detectEnvironmentProgressPrefix', brief);
}
export function buildDetectStepRow(stepId, rowId) {
    const li = document.createElement('li');
    li.className = 'detect-env-step';
    li.id = rowId;
    li.style.display = 'none';
    const stepIcon = document.createElement('span');
    stepIcon.className = 'detect-env-step-icon detect-env-icon running';
    const body = document.createElement('div');
    body.className = 'detect-env-step-body';
    const label = document.createElement('div');
    label.className = 'detect-env-step-label';
    label.textContent = detectStepLabel(stepId);
    const detail = document.createElement('div');
    detail.className = 'detect-env-step-detail';
    body.appendChild(label);
    body.appendChild(detail);
    li.appendChild(stepIcon);
    li.appendChild(body);
    return li;
}

export function ensureDetectStepsList(listEl, stepIdPrefix) {
    if (!listEl || listEl.dataset.ready === '1') {
        return;
    }
    listEl.textContent = '';
    DETECT_STEP_IDS.forEach(function(stepId) {
        listEl.appendChild(buildDetectStepRow(stepId, stepIdPrefix + stepId));
    });
    listEl.dataset.ready = '1';
}

export function refreshDetectStepLabels(listEl, stepIdPrefix) {
    if (!listEl) return;
    DETECT_STEP_IDS.forEach(function(stepId) {
        const label = listEl.querySelector('#' + stepIdPrefix + stepId + ' .detect-env-step-label');
        if (label) label.textContent = detectStepLabel(stepId);
    });
}

export function resetDetectStepsList(stepIdPrefix) {
    DETECT_STEP_IDS.forEach(function(stepId) {
        const row = document.getElementById(stepIdPrefix + stepId);
        if (!row) return;
        row.style.display = 'none';
        setDetectEnvIcon(row.querySelector('.detect-env-step-icon'), 'running');
        const detailEl = row.querySelector('.detect-env-step-detail');
        if (detailEl) detailEl.textContent = '';
    });
}

export function updateDetectStepsList(msg, stepIdPrefix, compactIconEl, compactTextEl) {
    const row = document.getElementById(stepIdPrefix + msg.step);
    if (row) {
        row.style.display = '';
        setDetectEnvIcon(row.querySelector('.detect-env-step-icon'), msg.status || 'running');
        const detailEl = row.querySelector('.detect-env-step-detail');
        if (detailEl) detailEl.textContent = formatDetectStepDetail(msg);
    }
    if (compactIconEl && compactTextEl && msg.brief) {
        setDetectEnvIcon(compactIconEl, msg.status || 'running');
        const text = formatDetectProgressDisplay(msg.brief);
        compactTextEl.textContent = text;
        compactTextEl.title = text;
    }
}

