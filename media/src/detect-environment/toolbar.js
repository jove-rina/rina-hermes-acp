import { getLocale } from '../core/locale.js';
import {
    DETECT_STEP_IDS,
    formatDetectProgressDisplay,
    setDetectEnvIcon,
    updateDetectStepsList,
    ensureDetectStepsList,
} from './steps.js';

export let detectEnvDetailsOpen = false;
export let detectEnvPanelReady = false;
export let detectEnvFinished = false;

export function setDetectEnvDetailsTitle() {
    const detailsTitle = document.getElementById('detectEnvDetailsTitle');
    if (!detailsTitle) return;
    detailsTitle.textContent = detectEnvFinished
        ? (getLocale().detectEnvironmentCompleteTitle || getLocale().detectEnvironmentStepSummary || '')
        : (getLocale().detectEnvironmentDetectTitle || getLocale().detectEnvironment || '');
}

export function setDetectEnvDetailsOpen(open) {
    detectEnvDetailsOpen = !!open;
    const details = document.getElementById('detectEnvDetails');
    const hint = document.getElementById('detectEnvCompactHint');
    const toggle = document.getElementById('detectEnvToggle');
    if (details) details.hidden = !detectEnvDetailsOpen;
    if (hint) hint.classList.toggle('is-open', detectEnvDetailsOpen);
    if (toggle) {
        toggle.setAttribute('aria-expanded', detectEnvDetailsOpen ? 'true' : 'false');
        toggle.title = detectEnvDetailsOpen
            ? (getLocale().detectEnvironmentHideDetails || '')
            : (getLocale().detectEnvironmentViewDetails || '');
    }
}
export function ensureDetectEnvironmentPanel() {
    const list = document.getElementById('detectEnvSteps');
    ensureDetectStepsList(list, 'detectStep-');
    if (!detectEnvPanelReady && list) {
        detectEnvPanelReady = true;
    }
}

export function showDetectEnvironmentBar() {
    ensureDetectEnvironmentPanel();
    const bar = document.getElementById('detectEnvBar');
    if (bar) bar.hidden = false;
}

export function hideDetectEnvironmentBar() {
    detectEnvFinished = false;
    setDetectEnvDetailsOpen(false);
    const bar = document.getElementById('detectEnvBar');
    if (bar) bar.hidden = true;
}

export function setDetectEnvironmentCompact(brief, status) {
    setDetectEnvIcon(document.getElementById('detectEnvCompactIcon'), status);
    const textEl = document.getElementById('detectEnvCompactText');
    if (textEl) {
        textEl.textContent = brief || '';
        textEl.title = brief || '';
    }
}

export function updateDetectEnvironmentStep(msg) {
    ensureDetectEnvironmentPanel();
    updateDetectStepsList(
        msg,
        'detectStep-',
        document.getElementById('detectEnvCompactIcon'),
        document.getElementById('detectEnvCompactText'),
    );
}

export function initDetectEnvironmentStart(mode) {
    detectEnvFinished = false;
    showDetectEnvironmentBar();
    setDetectEnvDetailsOpen(false);
    setDetectEnvDetailsTitle();
    const toggle = document.getElementById('detectEnvToggle');
    if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
        toggle.title = getLocale().detectEnvironmentViewDetails || '';
    }
    DETECT_STEP_IDS.forEach(function(stepId) {
        const row = document.getElementById('detectStep-' + stepId);
        if (!row) return;
        row.style.display = 'none';
        setDetectEnvIcon(row.querySelector('.detect-env-step-icon'), 'running');
        const detailEl = row.querySelector('.detect-env-step-detail');
        if (detailEl) detailEl.textContent = '';
    });
    setDetectEnvironmentCompact(
        formatDetectProgressDisplay('0%'),
        'running',
    );
}

export function finishDetectEnvironmentPanel(msg) {
    detectEnvFinished = true;
    setDetectEnvDetailsTitle();
    const summaryMsg = {
        step: 'summary',
        status: msg.summaryStatus || (msg.status === 'ready' ? 'ok' : 'fail'),
        reportStatus: msg.status,
        brief: msg.brief,
    };
    updateDetectEnvironmentStep(summaryMsg);
    setDetectEnvironmentCompact(formatDetectProgressDisplay(msg.brief || '100%'), summaryMsg.status);
}

