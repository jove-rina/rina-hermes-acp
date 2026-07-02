import {
    messagesEl,
    LOCAL_HISTORY_DIVIDER_ID,
    contextAttachPicker,
    contextAttachBtn,
    contextAttachLabel,
    contextAttachDropdown,
    contextAttachList,
    contextAttachHelp,
    contextAttachTooltipEl,
    contextAttachPreviewEl,
    contextAttachPreviewList,
    contextAttachSendModal,
} from '../core/dom-refs.js';
import { showModal, hideModal } from '../ui/modal.js';
import { getGroupRoleLabel } from '../messages/group-utils.js';

/** @param {Record<string, Function>} deps */
export function createContextAttach(deps) {
    let contextAttachVisible = false;
    let contextAttachMode = 'none';
    let contextAttachCustomIndices = [];
    let contextAttachCustomPending = false;
    let contextAttachCustomConfirmed = false;
    let contextAttachUnconfirmedIndices = [];
    let contextAttachPreviewOpen = false;
    let contextAttachPickerHiding = false;
    let contextAttachHasChoice = false;
    let pendingSendText = '';

function resetContextAttachPickerElement() {
    if (contextAttachPicker) {
        contextAttachPicker.hidden = true;
        contextAttachPicker.classList.remove('is-hiding', 'is-entering', 'is-attention');
    }
    contextAttachPickerHiding = false;
}

function forceHideContextAttachPicker() {
    contextAttachVisible = false;
    contextAttachMode = 'none';
    contextAttachCustomIndices = [];
    contextAttachCustomPending = false;
    contextAttachCustomConfirmed = false;
    contextAttachUnconfirmedIndices = [];
    contextAttachHasChoice = false;
    pendingSendText = '';
    if (deps.getMultiSelectPurpose() === 'contextAttach') {
        deps.exitMultiSelectMode();
    }
    resetContextAttachPickerElement();
    deps.closeAllDropdowns();
}

function finishHideContextAttachPicker() {
    contextAttachVisible = false;
    contextAttachMode = 'none';
    contextAttachCustomIndices = [];
    contextAttachCustomPending = false;
    contextAttachCustomConfirmed = false;
    contextAttachUnconfirmedIndices = [];
    contextAttachHasChoice = false;
    pendingSendText = '';
    if (deps.getMultiSelectPurpose() === 'contextAttach') {
        deps.exitMultiSelectMode();
    }
    resetContextAttachPickerElement();
    deps.closeAllDropdowns();
}

function hideContextAttachPicker() {
    if (!contextAttachVisible && !contextAttachPickerHiding) {
        return;
    }
    if (contextAttachPickerHiding) {
        return;
    }
    if (!contextAttachPicker || contextAttachPicker.hidden) {
        finishHideContextAttachPicker();
        return;
    }
    contextAttachPickerHiding = true;
    contextAttachPicker.classList.remove('is-entering', 'is-attention');
    contextAttachPicker.classList.add('is-hiding');
    hideContextAttachPreview();
    const onExitEnd = function(e) {
        if (e.target !== contextAttachPicker || e.animationName !== 'context-attach-exit') {
            return;
        }
        contextAttachPicker.removeEventListener('animationend', onExitEnd);
        finishHideContextAttachPicker();
    };
    contextAttachPicker.addEventListener('animationend', onExitEnd);
}

function positionContextAttachTooltip() {
    if (!contextAttachHelp || !contextAttachTooltipEl || contextAttachTooltipEl.hidden) {
        return;
    }
    const rect = contextAttachHelp.getBoundingClientRect();
    const tipRect = contextAttachTooltipEl.getBoundingClientRect();
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    let top = rect.top - tipRect.height - 10;
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
    if (top < 8) {
        top = rect.bottom + 10;
    }
    contextAttachTooltipEl.style.left = left + 'px';
    contextAttachTooltipEl.style.top = top + 'px';
}

function showContextAttachTooltip() {
    if (!contextAttachHelp || !contextAttachTooltipEl) {
        return;
    }
    contextAttachTooltipEl.textContent = deps.getLocale().contextAttachTooltip || contextAttachHelp.getAttribute('aria-label') || '';
    contextAttachTooltipEl.hidden = false;
    contextAttachTooltipEl.style.left = '-9999px';
    contextAttachTooltipEl.style.top = '0';
    requestAnimationFrame(function() {
        positionContextAttachTooltip();
    });
}

function hideContextAttachTooltip() {
    if (contextAttachTooltipEl) {
        contextAttachTooltipEl.hidden = true;
    }
}

function bindContextAttachTooltip() {
    if (!contextAttachHelp) {
        return;
    }
    contextAttachHelp.addEventListener('mouseenter', showContextAttachTooltip);
    contextAttachHelp.addEventListener('mouseleave', hideContextAttachTooltip);
    contextAttachHelp.addEventListener('focus', showContextAttachTooltip);
    contextAttachHelp.addEventListener('blur', hideContextAttachTooltip);
}

function getContextAttachRegionGroups() {
    const divider = document.getElementById(LOCAL_HISTORY_DIVIDER_ID);
    const groups = [];
    messagesEl.querySelectorAll('.message-group').forEach(function(group) {
        if (divider && !(group.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING)) {
            return;
        }
        groups.push(group);
    });
    return groups;
}

function ensureGroupSelectableForContextAttach(group) {
    if (!isAttachableMemoryGroup(group)) {
        return;
    }
    if (group.classList.contains('selectable')) {
        return;
    }
    group.classList.add('selectable', 'context-attach-extra-selectable');
    const selectWrap = document.createElement('label');
    selectWrap.className = 'msg-select-wrap';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.addEventListener('click', function(e) {
        e.stopPropagation();
    });
    checkbox.addEventListener('change', function() {
        deps.setGroupSelected(group, checkbox.checked);
    });
    selectWrap.appendChild(checkbox);
    group.insertBefore(selectWrap, group.firstChild);
    deps.wireSelectableGroup(group);
}

function ensureContextAttachSelectableTargets() {
    getContextAttachRegionGroups().forEach(ensureGroupSelectableForContextAttach);
}

function clearContextAttachSelectableTargets() {
    messagesEl.querySelectorAll('.message-group.context-attach-extra-selectable').forEach(function(group) {
        group.classList.remove('selectable', 'context-attach-extra-selectable', 'is-selected');
        const wrap = group.querySelector('.msg-select-wrap');
        if (wrap) {
            wrap.remove();
        }
        if (group.dataset.contextAttachReveal === '1') {
            group.style.display = 'none';
            delete group.dataset.contextAttachReveal;
        }
    });
}

function getExistingCustomAttachIndices() {
    if (contextAttachCustomIndices.length > 0) {
        return contextAttachCustomIndices.slice();
    }
    if (contextAttachUnconfirmedIndices.length > 0) {
        return contextAttachUnconfirmedIndices.slice();
    }
    return [];
}

function applyContextAttachIndicesToSelection(indices) {
    if (!indices.length) {
        return;
    }
    const indexSet = new Set(indices);
    const updates = [];
    getContextAttachRegionGroups().forEach(function(group) {
        const idx = parseInt(group.dataset.sessionIndex || '', 10);
        updates.push({
            group: group,
            selected: Number.isInteger(idx) && indexSet.has(idx),
        });
    });
    deps.setGroupsSelected(updates);
}

function getCustomContextAttachSelectionCount() {
    if (contextAttachCustomConfirmed) {
        return contextAttachCustomIndices.length;
    }
    if (deps.getMultiSelectMode() && deps.getMultiSelectPurpose() === 'contextAttach') {
        return deps.getSelectedMessageIndices().length;
    }
    if (contextAttachCustomPending || contextAttachUnconfirmedIndices.length > 0) {
        return getUnconfirmedCustomSelectionIndices().length;
    }
    return 0;
}

function getContextAttachCountLabel(count) {
    return (deps.getLocale().contextAttachSelected || '附带上轮已选{0}条记忆').replace('{0}', String(count));
}

function getContextAttachOptionLabel(mode) {
    switch (mode) {
        case 'last2':
            return deps.getLocale().contextAttachLast2;
        case 'last10':
            return deps.getLocale().contextAttachLast10;
        case 'all':
            return deps.getLocale().contextAttachAll;
        case 'custom': {
            const count = getCustomContextAttachSelectionCount();
            if (count > 0) {
                return getContextAttachCountLabel(count);
            }
            if (contextAttachCustomPending || contextAttachCustomConfirmed || contextAttachHasChoice) {
                return deps.getLocale().contextAttachCustomNone || '您没有选择任何记忆';
            }
            return deps.getLocale().contextAttachCustom;
        }
        case 'none':
        default:
            if (contextAttachHasChoice) {
                return deps.getLocale().contextAttachNone;
            }
            return deps.getLocale().contextAttachPlaceholder || deps.getLocale().contextAttachNone;
    }
}

function updateContextAttachButtonLabel() {
    if (!contextAttachLabel || !contextAttachBtn) {
        return;
    }
    const isPlaceholder = contextAttachMode === 'none' && !contextAttachHasChoice;
    contextAttachLabel.textContent = getContextAttachOptionLabel(contextAttachMode);
    contextAttachBtn.classList.toggle('is-placeholder', isPlaceholder);
    contextAttachBtn.title = isPlaceholder
        ? (deps.getLocale().contextAttachPlaceholder || '')
        : getContextAttachOptionLabel(contextAttachMode);
    if (contextAttachPreviewOpen) {
        if (hasContextAttachSelection()) {
            renderContextAttachPreviewContent();
            requestAnimationFrame(function() {
                positionContextAttachPreview();
            });
        } else {
            hideContextAttachPreview();
        }
    }
}

function getGroupPreviewRoleLabel(group) {
    if (group.classList.contains('permission')) {
        return deps.getLocale().permissionTitle || 'Permission';
    }
    if (group.classList.contains('thought')) {
        return deps.getLocale().roleThought || 'Thought';
    }
    if (group.classList.contains('tool')) {
        return deps.getLocale().roleTool || 'Tool';
    }
    return getGroupRoleLabel(group, deps.getLocale());
}

function getGroupPreviewText(group) {
    if (group.classList.contains('permission') && group._permissionState && group._permissionState.text) {
        return group._permissionState.text.trim();
    }
    if (group._auxState && group._auxState.rawText) {
        return group._auxState.rawText.trim();
    }
    return deps.getMessagePlainText(group).trim();
}

function isAttachableMemoryGroup(group) {
    return group.classList.contains('user')
        || group.classList.contains('assistant')
        || group.classList.contains('permission');
}

function getAttachableMemoryGroups() {
    return getContextAttachRegionGroups().filter(isAttachableMemoryGroup);
}

function resolveAttachPreviewGroups() {
    if (!contextAttachVisible || contextAttachMode === 'none') {
        return [];
    }
    const attachable = getAttachableMemoryGroups();
    if (contextAttachMode === 'last2') {
        return attachable.slice(-2);
    }
    if (contextAttachMode === 'last10') {
        return attachable.slice(-10);
    }
    if (contextAttachMode === 'all') {
        return attachable.slice();
    }
    if (contextAttachMode === 'custom') {
        let indices = [];
        if (contextAttachCustomConfirmed) {
            indices = contextAttachCustomIndices;
        } else if (deps.getMultiSelectMode() && deps.getMultiSelectPurpose() === 'contextAttach') {
            indices = deps.getSelectedMessageIndices();
        } else {
            indices = contextAttachUnconfirmedIndices;
        }
        if (!indices.length) {
            return [];
        }
        const byIndex = new Map();
        messagesEl.querySelectorAll('.message-group').forEach(function(group) {
            const idx = parseInt(group.dataset.sessionIndex || '', 10);
            if (Number.isInteger(idx)) {
                byIndex.set(idx, group);
            }
        });
        const picked = [];
        indices.forEach(function(index) {
            const group = byIndex.get(index);
            if (group && isAttachableMemoryGroup(group) && picked.indexOf(group) === -1) {
                picked.push(group);
            }
        });
        return picked;
    }
    return [];
}

function hasContextAttachSelection() {
    return resolveAttachPreviewGroups().length > 0;
}

function isInsideContextAttachPreview(node) {
    if (!node || !contextAttachPreviewEl) {
        return false;
    }
    return contextAttachPreviewEl === node || contextAttachPreviewEl.contains(node);
}

function estimateContextAttachInputTokens(groups) {
    const parts = [(deps.getLocale().contextAttachPrefixHeader || ''), '---'];
    groups.forEach(function(group) {
        parts.push(getGroupPreviewRoleLabel(group));
        parts.push(getGroupPreviewText(group));
    });
    const text = parts.join('\n');
    let weight = 0;
    for (let i = 0; i < text.length; i++) {
        weight += text.charCodeAt(i) > 0x2E7F ? 0.55 : 0.25;
    }
    return Math.max(1, Math.ceil(weight));
}

function updateContextAttachPreviewTitle(count, tokens) {
    const titleEl = document.getElementById('contextAttachPreviewTitle');
    if (!titleEl) {
        return;
    }
    const template = deps.getLocale().contextAttachPreviewTitle || '({0} / ~{1})';
    titleEl.textContent = template
        .replace('{0}', String(count))
        .replace('{1}', String(tokens));
}

function renderContextAttachPreviewContent() {
    if (!contextAttachPreviewList) {
        return;
    }
    const groups = resolveAttachPreviewGroups();
    if (!groups.length) {
        contextAttachPreviewList.innerHTML = '';
        updateContextAttachPreviewTitle(0, 0);
        return;
    }
    updateContextAttachPreviewTitle(groups.length, estimateContextAttachInputTokens(groups));
    contextAttachPreviewList.innerHTML = groups.map(function(group) {
        const role = escapeHtml(getGroupPreviewRoleLabel(group));
        const text = escapeHtml(getGroupPreviewText(group) || '—');
        return '<li class="context-attach-preview-item">' +
            '<span class="context-attach-preview-role">' + role + '</span>' +
            '<span class="context-attach-preview-text">' + text + '</span>' +
            '</li>';
    }).join('');
}

function positionContextAttachPreview() {
    if (!contextAttachBtn || !contextAttachPreviewEl || contextAttachPreviewEl.hidden) {
        return;
    }
    const rect = contextAttachBtn.getBoundingClientRect();
    const tipRect = contextAttachPreviewEl.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top - tipRect.height - 10;
    left = Math.max(8, Math.min(left, window.innerWidth - tipRect.width - 8));
    if (top < 8) {
        top = rect.bottom + 10;
    }
    contextAttachPreviewEl.style.left = left + 'px';
    contextAttachPreviewEl.style.top = top + 'px';
}

function showContextAttachPreview() {
    if (!contextAttachVisible || !contextAttachBtn || !contextAttachPreviewEl) {
        return;
    }
    if (contextAttachPicker && contextAttachPicker.classList.contains('is-open')) {
        return;
    }
    if (!hasContextAttachSelection()) {
        return;
    }
    renderContextAttachPreviewContent();
    contextAttachPreviewOpen = true;
    contextAttachPreviewEl.hidden = false;
    contextAttachPreviewEl.style.left = '-9999px';
    contextAttachPreviewEl.style.top = '0';
    requestAnimationFrame(function() {
        positionContextAttachPreview();
    });
}

function hideContextAttachPreview() {
    contextAttachPreviewOpen = false;
    if (contextAttachPreviewEl) {
        contextAttachPreviewEl.hidden = true;
    }
}

function bindContextAttachPreview() {
    if (!contextAttachBtn || !contextAttachPreviewEl) {
        return;
    }
    contextAttachBtn.addEventListener('mouseenter', function() {
        showContextAttachPreview();
    });
    contextAttachBtn.addEventListener('mousedown', function() {
        hideContextAttachPreview();
    });
    const contextAttachPreviewClose = document.getElementById('contextAttachPreviewClose');
    if (contextAttachPreviewClose) {
        contextAttachPreviewClose.addEventListener('click', function(e) {
            e.stopPropagation();
            hideContextAttachPreview();
        });
    }
    document.addEventListener('pointerdown', function(e) {
        if (!contextAttachPreviewOpen) {
            return;
        }
        if (isInsideContextAttachPreview(e.target)) {
            return;
        }
        hideContextAttachPreview();
    }, true);
}

function renderContextAttachOptions() {
    if (!contextAttachList) {
        return;
    }
    const options = [
        { mode: 'none', label: deps.getLocale().contextAttachNone },
        { mode: 'last2', label: deps.getLocale().contextAttachLast2 },
        { mode: 'last10', label: deps.getLocale().contextAttachLast10 },
        { mode: 'all', label: deps.getLocale().contextAttachAll },
        { mode: 'custom', label: deps.getLocale().contextAttachCustom },
    ];
    contextAttachList.innerHTML = options.map(function(opt) {
        const isActive = opt.mode === contextAttachMode
            && (opt.mode !== 'none' || contextAttachHasChoice);
        const active = isActive ? ' active' : '';
        return '<div class="dropdown-item' + active + '" data-attach-mode="' + escapeHtml(opt.mode) + '">' +
            escapeHtml(opt.label) + (isActive ? ' ✓' : '') + '</div>';
    }).join('');
    contextAttachList.querySelectorAll('.dropdown-item[data-attach-mode]').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            const mode = this.dataset.attachMode;
            if (mode === 'custom') {
                contextAttachHasChoice = true;
                enterContextAttachSelectMode();
                return;
            }
            if (deps.getMultiSelectPurpose() === 'contextAttach') {
                deps.exitMultiSelectMode();
            }
            contextAttachCustomPending = false;
            contextAttachCustomConfirmed = false;
            contextAttachUnconfirmedIndices = [];
            contextAttachHasChoice = true;
            contextAttachMode = mode;
            contextAttachCustomIndices = [];
            updateContextAttachButtonLabel();
            renderContextAttachOptions();
            hideContextAttachPreview();
            deps.closeAllDropdowns();
        });
    });
}

function showContextAttachPicker() {
    contextAttachVisible = true;
    contextAttachMode = 'none';
    contextAttachCustomIndices = [];
    contextAttachCustomPending = false;
    contextAttachCustomConfirmed = false;
    contextAttachUnconfirmedIndices = [];
    contextAttachHasChoice = false;
    hideContextAttachPreview();
    if (contextAttachPicker) {
        contextAttachPicker.classList.remove('is-hiding', 'is-entering', 'is-attention');
        contextAttachPicker.hidden = false;
        contextAttachPicker.classList.add('is-entering', 'is-attention');
        const onPickerAnimEnd = function(e) {
            if (e.target !== contextAttachPicker || e.animationName !== 'context-attach-enter') {
                return;
            }
            contextAttachPicker.classList.remove('is-entering');
            contextAttachPicker.removeEventListener('animationend', onPickerAnimEnd);
        };
        contextAttachPicker.addEventListener('animationend', onPickerAnimEnd);
        if (contextAttachBtn) {
            const onAttentionEnd = function(e) {
                if (e.target !== contextAttachBtn || e.animationName !== 'context-attach-attention-pulse') {
                    return;
                }
                contextAttachPicker.classList.remove('is-attention');
                contextAttachBtn.removeEventListener('animationend', onAttentionEnd);
            };
            contextAttachBtn.addEventListener('animationend', onAttentionEnd);
        }
    }
    contextAttachPickerHiding = false;
    updateContextAttachButtonLabel();
    renderContextAttachOptions();
}

function enterContextAttachSelectMode() {
    const previousIndices = getExistingCustomAttachIndices();
    contextAttachCustomPending = true;
    contextAttachCustomConfirmed = false;
    contextAttachUnconfirmedIndices = previousIndices.slice();
    contextAttachMode = 'custom';
    deps.closeAllDropdowns();
    ensureContextAttachSelectableTargets();
    deps.enterMultiSelectMode(null, 'contextAttach');
    applyContextAttachIndicesToSelection(previousIndices);
    updateContextAttachButtonLabel();
}

function confirmContextAttachSelection() {
    const indices = deps.getSelectedMessageIndices();
    if (!indices.length) {
        return;
    }
    contextAttachCustomIndices = indices.slice();
    contextAttachUnconfirmedIndices = [];
    contextAttachMode = 'custom';
    contextAttachCustomConfirmed = true;
    contextAttachCustomPending = false;
    contextAttachHasChoice = true;
    deps.exitMultiSelectMode();
    updateContextAttachButtonLabel();
    renderContextAttachOptions();
}

function getUnconfirmedCustomSelectionIndices() {
    if (deps.getMultiSelectMode() && deps.getMultiSelectPurpose() === 'contextAttach') {
        return deps.getSelectedMessageIndices();
    }
    return contextAttachUnconfirmedIndices.slice();
}

function hasUnconfirmedCustomMemorySelection() {
    if (!contextAttachVisible || contextAttachCustomConfirmed) {
        return false;
    }
    if (contextAttachMode !== 'custom' && !contextAttachCustomPending) {
        return false;
    }
    return getUnconfirmedCustomSelectionIndices().length > 0;
}

function buildContextAttachPayload(forceNoAttach) {
    if (!contextAttachVisible) {
        return undefined;
    }
    if (forceNoAttach) {
        return { mode: 'none' };
    }
    if (contextAttachCustomConfirmed && contextAttachMode === 'custom') {
        return {
            mode: 'custom',
            indices: contextAttachCustomIndices.slice(),
        };
    }
    if (contextAttachMode === 'none') {
        return { mode: 'none' };
    }
    if (contextAttachMode === 'custom' && !contextAttachCustomConfirmed) {
        return { mode: 'none' };
    }
    return {
        mode: contextAttachMode,
        indices: undefined,
    };
}

function finalizeContextAttachSelectionFromPending() {
    const indices = getUnconfirmedCustomSelectionIndices();
    if (!indices.length) {
        return false;
    }
    contextAttachCustomIndices = indices.slice();
    contextAttachUnconfirmedIndices = [];
    contextAttachMode = 'custom';
    contextAttachCustomConfirmed = true;
    contextAttachCustomPending = false;
    contextAttachHasChoice = true;
    if (deps.getMultiSelectMode() && deps.getMultiSelectPurpose() === 'contextAttach') {
        deps.exitMultiSelectMode();
    }
    updateContextAttachButtonLabel();
    renderContextAttachOptions();
    return true;
}

function openContextAttachSendModal(text) {
    pendingSendText = text;
    showModal(contextAttachSendModal);
}

function closeContextAttachSendModal() {
    pendingSendText = '';
    hideModal(contextAttachSendModal);
}


    function bindContextAttachEvents() {
        bindContextAttachTooltip();
        bindContextAttachPreview();
        const yesBtn = document.getElementById('contextAttachSendYesBtn');
        const noBtn = document.getElementById('contextAttachSendNoBtn');
        if (yesBtn) {
            yesBtn.addEventListener('click', function() {
                const text = pendingSendText;
                if (!text) { closeContextAttachSendModal(); return; }
                finalizeContextAttachSelectionFromPending();
                closeContextAttachSendModal();
                deps.executeSendMessage(text, buildContextAttachPayload(false));
            });
        }
        if (noBtn) {
            noBtn.addEventListener('click', function() {
                const text = pendingSendText;
                closeContextAttachSendModal();
                if (text) deps.executeSendMessage(text, { mode: 'none' });
            });
        }
        if (contextAttachBtn && contextAttachDropdown) {
            contextAttachBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const open = contextAttachDropdown.style.display === 'none';
                deps.closeAllDropdowns();
                if (open) {
                    contextAttachPicker.classList.add('is-open');
                    contextAttachDropdown.style.display = 'block';
                    renderContextAttachOptions();
                }
            });
            contextAttachDropdown.addEventListener('click', function(e) { e.stopPropagation(); });
        }
    }

    function handleExitMultiSelectAttachMode(indices) {
        if (contextAttachCustomPending && !contextAttachCustomConfirmed) {
            if (indices.length > 0) {
                contextAttachUnconfirmedIndices = indices.slice();
                contextAttachMode = 'custom';
            } else {
                contextAttachMode = 'none';
                contextAttachCustomPending = false;
                contextAttachUnconfirmedIndices = [];
            }
        }
    }

    return {
        showContextAttachPicker,
        hideContextAttachPicker,
        forceHideContextAttachPicker,
        hideContextAttachTooltip,
        hideContextAttachPreview,
        isPreviewOpen: () => contextAttachPreviewOpen,
        isInsideContextAttachPreview,
        isAttachableMemoryGroup,
        clearContextAttachSelectableTargets,
        handleExitMultiSelectAttachMode,
        renderContextAttachOptions,
        updateContextAttachButtonLabel,
        confirmContextAttachSelection,
        hasUnconfirmedCustomMemorySelection,
        openContextAttachSendModal,
        closeContextAttachSendModal,
        buildContextAttachPayload,
        finalizeContextAttachSelectionFromPending,
        bindContextAttachEvents,
    };
}

