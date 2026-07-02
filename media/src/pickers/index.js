import { vscode } from '../core/vscode.js';
import { escapeHtml } from '../utils/escape-html.js';
import {
    contextAttachPicker,
    contextAttachDropdown,
    inputEl,
} from '../core/dom-refs.js';

/** @param {Record<string, Function>} deps */
export function createPickers(deps) {
    const profilePicker = document.getElementById('profilePicker');
    const profileBtn = document.getElementById('profileBtn');
    const profileDropdown = document.getElementById('profileDropdown');
    const modelPicker = document.getElementById('modelPicker');
    const modelBtn = document.getElementById('modelBtn');
    const modelLabelEl = document.getElementById('modelLabel');
    const modelDropdown = document.getElementById('modelDropdown');

    let modelConfigId = '';
    let lastModelPayload = null;

    function closeAllDropdowns() {
        profilePicker.classList.remove('is-open');
        modelPicker.classList.remove('is-open');
        if (contextAttachPicker) contextAttachPicker.classList.remove('is-open');
        profileDropdown.style.display = 'none';
        modelDropdown.style.display = 'none';
        if (contextAttachDropdown) contextAttachDropdown.style.display = 'none';
        deps.hideContextAttachTooltip();
        deps.hideContextAttachPreview();
    }

    function renderProfileList(profiles) {
        const locale = deps.getLocale();
        const list = document.getElementById('profileList');
        const current = document.getElementById('profileLabel').textContent;
        const entries = (profiles || []).map(function(item) {
            if (item && typeof item === 'object' && item.id) {
                return { id: String(item.id), label: String(item.label || item.id) };
            }
            const name = String(item || '');
            return { id: name, label: name };
        });
        if (!entries.length) {
            list.innerHTML = '<div class="dropdown-item disabled">' + escapeHtml(locale.configureAgents) + '</div>';
            return;
        }
        list.innerHTML = entries.map(function(entry) {
            const active = entry.label === current ? ' active' : '';
            return '<div class="dropdown-item' + active + '" data-profile="' + escapeHtml(entry.id) + '">' +
                escapeHtml(entry.label) + (active ? ' ✓' : '') + '</div>';
        }).join('');
        list.querySelectorAll('.dropdown-item[data-profile]').forEach(function(item) {
            item.addEventListener('click', function() {
                vscode.postMessage({ type: 'switchAgent', agentName: this.dataset.profile });
                closeAllDropdowns();
            });
        });
    }

    function shouldShowModelPlaceholder(payload) {
        if (!payload) {
            return true;
        }
        const models = payload.models || [];
        if (!models.length) {
            return true;
        }
        if (!payload.currentValueId) {
            return true;
        }
        return !models.some(function(m) {
            return m.valueId === payload.currentValueId;
        });
    }

    function updateModelButtonDisplay(payload) {
        const locale = deps.getLocale();
        if (!modelLabelEl || !modelBtn) {
            return;
        }
        if (shouldShowModelPlaceholder(payload)) {
            modelLabelEl.textContent = locale.modelPlaceholder || '';
            modelBtn.classList.add('is-placeholder');
            modelBtn.title = locale.modelPlaceholder || locale.switchModel || '';
            return;
        }
        modelLabelEl.textContent = payload.currentLabel || payload.currentValueId || '';
        modelBtn.classList.remove('is-placeholder');
        modelBtn.title = payload.fromAgent
            ? locale.modelFromAgent
            : locale.modelLocalPreference;
    }

    function renderModelList(payload) {
        const locale = deps.getLocale();
        const list = document.getElementById('modelList');
        lastModelPayload = payload;
        modelConfigId = payload.configId || '';
        updateModelButtonDisplay(payload);

        const groups = Array.isArray(payload.groups) ? payload.groups.filter(function(g) {
            return g && Array.isArray(g.models) && g.models.length > 0;
        }) : [];
        const models = payload.models || [];

        if (!models.length) {
            list.innerHTML = '<div class="dropdown-item disabled">' + escapeHtml(locale.noModels) + '</div>';
            return;
        }

        if (groups.length > 1) {
            list.innerHTML = groups.map(function(group) {
                const header = '<div class="dropdown-group-label">' + escapeHtml(group.name || group.slug || '') + '</div>';
                const items = group.models.map(function(m) {
                    const active = m.valueId === payload.currentValueId;
                    return '<div class="dropdown-item' + (active ? ' active' : '') + '" data-value="' + escapeHtml(m.valueId) + '">' +
                        escapeHtml(m.name) + (active ? ' ✓' : '') + '</div>';
                }).join('');
                return header + items;
            }).join('');
        } else {
            list.innerHTML = models.map(function(m) {
                const active = m.valueId === payload.currentValueId;
                return '<div class="dropdown-item' + (active ? ' active' : '') + '" data-value="' + escapeHtml(m.valueId) + '">' +
                    escapeHtml(m.name) + (active ? ' ✓' : '') + '</div>';
            }).join('');
        }
        list.querySelectorAll('.dropdown-item[data-value]').forEach(function(item) {
            item.addEventListener('click', function() {
                vscode.postMessage({
                    type: 'switchModel',
                    configId: modelConfigId,
                    valueId: this.dataset.value
                });
                closeAllDropdowns();
            });
        });
    }

    function bindPickerEvents() {
        document.addEventListener('click', function(e) {
            if (e.target.closest('.picker')) {
                return;
            }
            if (e.target.closest('#contextAttachPreview')) {
                return;
            }
            if (!e.target.closest('#input-area')) {
                deps.hideFilePicker();
            }
            closeAllDropdowns();
        });

        profileBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const open = profileDropdown.style.display === 'none';
            closeAllDropdowns();
            if (open) {
                profilePicker.classList.add('is-open');
                profileDropdown.style.display = 'block';
                vscode.postMessage({ type: 'getProfiles' });
            }
        });
        profileDropdown.addEventListener('click', function(e) { e.stopPropagation(); });

        modelBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            const open = modelDropdown.style.display === 'none';
            closeAllDropdowns();
            if (open) {
                modelPicker.classList.add('is-open');
                modelDropdown.style.display = 'block';
                vscode.postMessage({ type: 'getModels' });
            }
        });
        modelDropdown.addEventListener('click', function(e) { e.stopPropagation(); });
    }

    function refreshModelButtonDisplay() {
        updateModelButtonDisplay(lastModelPayload);
    }

    return {
        closeAllDropdowns,
        renderProfileList,
        renderModelList,
        refreshModelButtonDisplay,
        bindPickerEvents,
    };
}
