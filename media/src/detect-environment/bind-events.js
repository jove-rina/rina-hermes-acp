import { vscode } from '../core/vscode.js';
import { detectEnvDetailsOpen, setDetectEnvDetailsOpen } from './toolbar.js';

export function doDetectEnvironment() {
    vscode.postMessage({ type: 'detectEnvironment' });
}

export function bindDetectToolbarEvents(detectEnvBtn, detectEnvClose) {
    const detectEnvToggle = document.getElementById('detectEnvToggle');
    if (detectEnvToggle) {
        detectEnvToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            setDetectEnvDetailsOpen(!detectEnvDetailsOpen);
            detectEnvToggle.setAttribute('aria-expanded', detectEnvDetailsOpen ? 'true' : 'false');
        });
    }
    if (detectEnvClose) {
        detectEnvClose.addEventListener('click', function(e) {
            e.stopPropagation();
            hideDetectEnvironmentBar();
            vscode.postMessage({ type: 'detectEnvironmentDismiss' });
        });
    }
    if (detectEnvBtn) detectEnvBtn.addEventListener('click', doDetectEnvironment);
}

