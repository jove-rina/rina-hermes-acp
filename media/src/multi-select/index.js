import { vscode } from '../core/vscode.js';
import {
    messagesEl,
    multiSelectToolbar,
    multiSelectCount,
    multiSelectAllBtn,
    multiSelectDeleteBtn,
    multiSelectCopyBtn,
    multiSelectExportBtn,
    multiSelectAttachConfirmBtn,
    LOCAL_HISTORY_DIVIDER_ID,
} from '../core/dom-refs.js';

/** @param {Record<string, Function>} deps */
export function createMultiSelect(deps) {
    function isGroupInContextAttachRegion(group) {
        const divider = document.getElementById(LOCAL_HISTORY_DIVIDER_ID);
        if (!divider) {
            return true;
        }
        return !!(group.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING);
    }

    function getSelectableGroups() {
        const purpose = deps.getMultiSelectPurpose();
        return Array.from(messagesEl.querySelectorAll('.message-group.selectable')).filter(function(group) {
            if (group.style.display === 'none') {
                return false;
            }
            if (purpose === 'contextAttach' && !isGroupInContextAttachRegion(group)) {
                return false;
            }
            if (purpose === 'contextAttach' && !deps.isAttachableMemoryGroup(group)) {
                return false;
            }
            return true;
        });
    }

    function getSelectedGroups() {
        return getSelectableGroups().filter(function(group) {
            return group.classList.contains('is-selected');
        });
    }

    function getGroupCheckbox(group) {
        return group.querySelector('.msg-select-wrap input[type="checkbox"]');
    }

    function updateMultiSelectToolbar() {
        const locale = deps.getLocale();
        const selected = getSelectedGroups();
        const count = selected.length;
        const purpose = deps.getMultiSelectPurpose();
        const isAttachMode = purpose === 'contextAttach';
        if (multiSelectCount) {
            multiSelectCount.textContent = count > 0
                ? (locale.multiSelectCount || '{0} selected').replace('{0}', String(count))
                : (locale.selectMessages || 'Select');
        }
        const hasSelection = count > 0;
        if (multiSelectDeleteBtn) multiSelectDeleteBtn.disabled = !hasSelection;
        if (multiSelectCopyBtn) multiSelectCopyBtn.disabled = !hasSelection;
        if (multiSelectExportBtn) multiSelectExportBtn.disabled = !hasSelection;
        if (multiSelectAttachConfirmBtn) {
            multiSelectAttachConfirmBtn.hidden = !isAttachMode;
            multiSelectAttachConfirmBtn.disabled = !hasSelection;
        }
        const selectableGroups = getSelectableGroups();
        if (multiSelectAllBtn) {
            multiSelectAllBtn.textContent = areAllSelectableGroupsSelected(selectableGroups)
                ? (locale.multiSelectDeselectAll || '取消全选')
                : (locale.multiSelectAll || '全选');
        }
        if (isAttachMode) {
            deps.updateContextAttachButtonLabel();
        }
        deps.hideContextAttachPreview();
    }

    function setGroupSelected(group, selected) {
        group.classList.toggle('is-selected', selected);
        const checkbox = getGroupCheckbox(group);
        if (checkbox) checkbox.checked = selected;
        updateMultiSelectToolbar();
    }

    function setGroupsSelected(updates) {
        updates.forEach(function(entry) {
            entry.group.classList.toggle('is-selected', entry.selected);
            const checkbox = getGroupCheckbox(entry.group);
            if (checkbox) checkbox.checked = entry.selected;
        });
        updateMultiSelectToolbar();
    }

    function areAllSelectableGroupsSelected(groups) {
        return groups.length > 0 && groups.every(function(group) {
            return group.classList.contains('is-selected');
        });
    }

    function toggleGroupSelection(group) {
        setGroupSelected(group, !group.classList.contains('is-selected'));
    }

    function enterMultiSelectMode(initialGroup, purpose) {
        deps.setMultiSelectPurpose(purpose || 'normal');
        if (deps.getMultiSelectMode()) {
            if (initialGroup) {
                setGroupSelected(initialGroup, true);
            }
            updateMultiSelectToolbar();
            return;
        }
        deps.setMultiSelectMode(true);
        messagesEl.classList.add('multi-select-active');
        if (multiSelectToolbar) {
            multiSelectToolbar.hidden = false;
            multiSelectToolbar.classList.add('visible');
        }
        if (initialGroup) {
            setGroupSelected(initialGroup, true);
        } else {
            updateMultiSelectToolbar();
        }
    }

    function exitMultiSelectMode() {
        if (!deps.getMultiSelectMode()) {
            return;
        }
        const wasAttachMode = deps.getMultiSelectPurpose() === 'contextAttach';
        if (wasAttachMode) {
            deps.handleExitMultiSelectAttachMode(getSelectedMessageIndices());
        }
        deps.setMultiSelectMode(false);
        deps.setMultiSelectPurpose('normal');
        messagesEl.classList.remove('multi-select-active');
        getSelectableGroups().forEach(function(group) {
            setGroupSelected(group, false);
        });
        deps.clearContextAttachSelectableTargets();
        if (multiSelectToolbar) {
            multiSelectToolbar.hidden = true;
            multiSelectToolbar.classList.remove('visible');
        }
        updateMultiSelectToolbar();
        deps.updateContextAttachButtonLabel();
    }

    function wireSelectableGroup(group) {
        if (group.dataset.selectWired) return;
        group.dataset.selectWired = '1';
        group.addEventListener('click', function(e) {
            if (!deps.getMultiSelectMode()) return;
            if (deps.getMultiSelectPurpose() === 'contextAttach' && !isGroupInContextAttachRegion(group)) {
                return;
            }
            if (e.target.closest('.message-actions, .block-actions, .insert-dropdown, .insert-dropdown-menu, .msg-select-wrap')) {
                return;
            }
            e.preventDefault();
            toggleGroupSelection(group);
        });
    }

    function getSelectedMessageIndices(groups) {
        return (groups || getSelectedGroups()).map(function(group) {
            return parseInt(group.dataset.sessionIndex || '', 10);
        }).filter(function(index) {
            return Number.isInteger(index) && index >= 0;
        });
    }

    function deleteSelectedGroups() {
        const selected = getSelectedGroups();
        if (!selected.length) return;
        const indices = selected.map(function(group) {
            return parseInt(group.dataset.sessionIndex || '', 10);
        }).filter(function(index) {
            return Number.isInteger(index) && index >= 0;
        });
        vscode.postMessage({ type: 'deleteMessages', indices: indices });
        selected.forEach(function(group) {
            group.remove();
        });
        deps.reindexSessionIndices();
        exitMultiSelectMode();
        deps.updateQuickActionBtns();
        if (!messagesEl.querySelector('.message-group')) {
            deps.placeholder.style.display = 'block';
        }
    }

    function exportSelectedGroups() {
        const indices = getSelectedMessageIndices();
        if (!indices.length) return;
        deps.requestSessionExport('export', indices);
    }

    function bindMultiSelectEvents() {
        if (multiSelectAllBtn) {
            multiSelectAllBtn.addEventListener('click', function() {
                if (!deps.getMultiSelectMode()) {
                    enterMultiSelectMode(null, deps.getMultiSelectPurpose());
                }
                const groups = getSelectableGroups();
                const selectAll = !areAllSelectableGroupsSelected(groups);
                setGroupsSelected(groups.map(function(group) {
                    return { group: group, selected: selectAll };
                }));
            });
        }
        if (multiSelectDeleteBtn) {
            multiSelectDeleteBtn.addEventListener('click', function() {
                if (multiSelectDeleteBtn.disabled) return;
                deleteSelectedGroups();
            });
        }
        if (multiSelectCopyBtn) {
            multiSelectCopyBtn.addEventListener('click', function() {
                if (multiSelectCopyBtn.disabled) return;
                const indices = getSelectedMessageIndices();
                if (!indices.length) return;
                deps.requestSessionExport('copy', indices);
            });
        }
        if (multiSelectExportBtn) {
            multiSelectExportBtn.addEventListener('click', function() {
                if (multiSelectExportBtn.disabled) return;
                exportSelectedGroups();
            });
        }
        const multiSelectExitBtn = document.getElementById('multiSelectExitBtn');
        if (multiSelectExitBtn) {
            multiSelectExitBtn.addEventListener('click', exitMultiSelectMode);
        }
        if (multiSelectAttachConfirmBtn) {
            multiSelectAttachConfirmBtn.addEventListener('click', function() {
                if (multiSelectAttachConfirmBtn.disabled) {
                    return;
                }
                deps.confirmContextAttachSelection();
            });
        }
    }

    return {
        setGroupSelected,
        wireSelectableGroup,
        enterMultiSelectMode,
        exitMultiSelectMode,
        getSelectedMessageIndices,
        getSelectedGroups,
        deleteSelectedGroups,
        exportSelectedGroups,
        updateMultiSelectToolbar,
        bindMultiSelectEvents,
    };
}
