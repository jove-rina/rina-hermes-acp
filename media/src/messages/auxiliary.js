import { renderMarkdown } from './markdown.js';

const THOUGHT_COLLAPSED_LINES = 5;
const TOOL_COLLAPSED_LINES = 3;
const AUX_LINE_HEIGHT_EM = 1.35;
const TOOL_SHORT_MAX_LINES = 3;
const TOOL_AGGREGATE_MAX_LINES = 12;
const TOOL_AGGREGATE_SEPARATOR = '\n\n---\n\n';

/** @param {Record<string, Function>} deps */
export function createAuxiliaryMessages(deps) {
    const toolCallMap = {};
    let toolAggregateGroupId = null;

    function getAuxCollapsedLines(role) {
        return role === 'thought' ? THOUGHT_COLLAPSED_LINES : TOOL_COLLAPSED_LINES;
    }

    function getAuxCollapsedMaxHeight(role) {
        return (AUX_LINE_HEIGHT_EM * getAuxCollapsedLines(role)) + 'em';
    }

    function auxDetailOverflows(scrollEl, text, maxLines) {
        if (!scrollEl) return false;
        if (text && text.split('\n').length > maxLines) return true;
        return scrollEl.scrollHeight > scrollEl.clientHeight + 1;
    }

    function syncAuxiliaryDetailView(group) {
        const state = group._auxState;
        if (!state || !state.scrollEl) return;
        const maxLines = getAuxCollapsedLines(state.role);
        state.scrollEl.classList.toggle('is-collapsed', !state.detailExpanded);
        state.scrollEl.classList.toggle('is-expanded', state.detailExpanded);
        if (!state.detailExpanded) {
            state.scrollEl.style.maxHeight = getAuxCollapsedMaxHeight(state.role);
            state.scrollEl.scrollTop = state.scrollEl.scrollHeight;
        } else {
            state.scrollEl.style.maxHeight = '';
        }
        const overflow = auxDetailOverflows(state.scrollEl, state.rawText, maxLines);
        state.moreBtn.hidden = state.detailExpanded || !overflow;
        state.lessBtn.hidden = !state.detailExpanded || !overflow;
    }

    function countNonemptyLines(text) {
        const trimmed = (text || '').trim();
        if (!trimmed) return 0;
        return trimmed.split('\n').filter(function(line) { return line.trim().length > 0; }).length;
    }

    function isShortToolText(text) {
        return countNonemptyLines(text) <= TOOL_SHORT_MAX_LINES;
    }

    function isAggregatedToolText(text) {
        return (text || '').indexOf('---') >= 0;
    }

    function mergeToolTexts(existing, incoming) {
        return existing.trim() + TOOL_AGGREGATE_SEPARATOR + incoming.trim();
    }

    function canAggregateToolTexts(existing, incoming) {
        if (!isShortToolText(incoming)) return false;
        const existingLines = countNonemptyLines(existing);
        if (existingLines > TOOL_SHORT_MAX_LINES && !isAggregatedToolText(existing)) return false;
        return countNonemptyLines(mergeToolTexts(existing, incoming)) <= TOOL_AGGREGATE_MAX_LINES;
    }

    function setAuxiliaryContent(group, text) {
        const state = group._auxState;
        if (!state) return;
        state.rawText = text || '';
        state.contentEl.innerHTML = renderMarkdown(state.rawText);
        deps.setupContentBlocks(state.contentEl);
        deps.processFileRefs(state.contentEl);
        syncAuxiliaryDetailView(group);
    }

    function rebuildAggregateToolContent(group) {
        const state = group._auxState;
        if (!state || !state.aggregatedTools || !state.aggregatedTools.length) return;
        const merged = state.aggregatedTools
            .map(function(entry) { return entry.text.trim(); })
            .filter(Boolean)
            .join(TOOL_AGGREGATE_SEPARATOR);
        setAuxiliaryContent(group, merged);
    }

    function resetToolAggregation() {
        toolAggregateGroupId = null;
    }

    function ensureAggregateEntries(group) {
        const state = group._auxState;
        if (!state) return;
        if (state.aggregatedTools && state.aggregatedTools.length) return;
        let firstId = null;
        const firstText = state.rawText || '';
        Object.keys(toolCallMap).forEach(function(id) {
            if (toolCallMap[id] === group.id && !firstId) {
                firstId = id;
            }
        });
        state.aggregatedTools = [{
            toolCallId: firstId || ('tool_' + group.id),
            text: firstText,
        }];
    }

    function clearAllToolLive() {
        Object.keys(toolCallMap).forEach(function(key) {
            const group = document.getElementById(toolCallMap[key]);
            const msg = group && group.querySelector('.message.tool');
            if (msg) msg.classList.remove('is-live');
        });
    }

    function setAuxMessageLive(group, live) {
        if (!group) return;
        const msg = group.querySelector('.message.thought, .message.tool');
        if (msg) msg.classList.toggle('is-live', live);
    }

    function finalizeAuxiliaryBubble(group) {
        if (!group || !group._auxState) return;
        setAuxiliaryContent(group, group._auxState.rawText);
    }

    function buildAuxiliaryMessage(role, text) {
        const locale = deps.getLocale();
        const div = document.createElement('div');
        div.className = 'message ' + role;

        const header = document.createElement('div');
        header.className = 'aux-header';
        const label = document.createElement('div');
        label.className = 'label aux-label';
        label.textContent = role === 'thought' ? locale.roleThought : locale.roleTool;
        header.appendChild(label);
        div.appendChild(header);

        const wrap = document.createElement('div');
        wrap.className = 'aux-body-wrap';

        const scrollEl = document.createElement('div');
        scrollEl.className = 'aux-body-scroll is-collapsed';
        const contentEl = document.createElement('div');
        contentEl.className = 'aux-body-content';
        scrollEl.appendChild(contentEl);
        wrap.appendChild(scrollEl);

        const controls = document.createElement('div');
        controls.className = 'aux-body-controls';
        const moreBtn = document.createElement('button');
        moreBtn.type = 'button';
        moreBtn.className = 'aux-body-toggle';
        moreBtn.textContent = locale.permissionShowMore || 'Show more';
        const lessBtn = document.createElement('button');
        lessBtn.type = 'button';
        lessBtn.className = 'aux-body-toggle';
        lessBtn.textContent = locale.permissionCollapse || 'Collapse';
        lessBtn.hidden = true;
        controls.appendChild(moreBtn);
        controls.appendChild(lessBtn);
        wrap.appendChild(controls);
        div.appendChild(wrap);

        return { div, scrollEl, contentEl, moreBtn, lessBtn, role, rawText: text || '' };
    }

    function wireAuxiliaryMessage(group, parts, deferMarkdown) {
        const state = {
            role: parts.role,
            rawText: parts.rawText,
            detailExpanded: false,
            scrollEl: parts.scrollEl,
            contentEl: parts.contentEl,
            moreBtn: parts.moreBtn,
            lessBtn: parts.lessBtn,
        };
        group._auxState = state;
        parts.moreBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            state.detailExpanded = true;
            syncAuxiliaryDetailView(group);
        });
        parts.lessBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            state.detailExpanded = false;
            syncAuxiliaryDetailView(group);
        });
        if (deferMarkdown) {
            state.contentEl.textContent = parts.rawText || '';
            syncAuxiliaryDetailView(group);
        } else {
            setAuxiliaryContent(group, parts.rawText);
        }
    }

    function handleToolMessage(text, toolCallId) {
        if (toolCallMap[toolCallId]) {
            const group = document.getElementById(toolCallMap[toolCallId]);
            if (group && group._auxState) {
                if (group._auxState.aggregatedTools && group._auxState.aggregatedTools.length) {
                    const entry = group._auxState.aggregatedTools.find(function(t) {
                        return t.toolCallId === toolCallId;
                    });
                    if (entry) {
                        entry.text = text;
                    }
                    rebuildAggregateToolContent(group);
                } else {
                    setAuxiliaryContent(group, text);
                }
                setAuxMessageLive(group, true);
                deps.maybeScrollToBottom();
            }
            return;
        }

        deps.finalizeAssistantBubble();

        if (toolAggregateGroupId) {
            const group = document.getElementById(toolAggregateGroupId);
            if (group && group._auxState && canAggregateToolTexts(group._auxState.rawText || '', text)) {
                ensureAggregateEntries(group);
                group._auxState.aggregatedTools.push({ toolCallId: toolCallId, text: text });
                rebuildAggregateToolContent(group);
                toolCallMap[toolCallId] = toolAggregateGroupId;
                setAuxMessageLive(group, true);
                deps.enableStopAfterAgentOutput();
                deps.maybeScrollToBottom();
                return;
            }
        }

        const id = deps.addMessage('tool', text);
        toolCallMap[toolCallId] = id;
        toolAggregateGroupId = id;
    }

    function clearToolState() {
        Object.keys(toolCallMap).forEach(function(key) {
            delete toolCallMap[key];
        });
        toolAggregateGroupId = null;
    }

    function refreshAllAuxiliaryLocale() {
        const locale = deps.getLocale();
        document.querySelectorAll('.message-group.thought, .message-group.tool').forEach(function(group) {
            if (!group._auxState) return;
            group._auxState.moreBtn.textContent = locale.permissionShowMore || 'Show more';
            group._auxState.lessBtn.textContent = locale.permissionCollapse || 'Collapse';
            const labelEl = group.querySelector('.aux-label');
            if (labelEl) {
                labelEl.textContent = group._auxState.role === 'thought' ? locale.roleThought : locale.roleTool;
            }
            syncAuxiliaryDetailView(group);
        });
    }

    return {
        buildAuxiliaryMessage,
        wireAuxiliaryMessage,
        setAuxiliaryContent,
        syncAuxiliaryDetailView,
        handleToolMessage,
        resetToolAggregation,
        clearAllToolLive,
        setAuxMessageLive,
        finalizeAuxiliaryBubble,
        clearToolState,
        refreshAllAuxiliaryLocale,
    };
}
