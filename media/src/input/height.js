import {
    chatBodyEl,
    inputAreaEl,
    inputEl,
    inputResizeHandle,
} from '../core/dom-refs.js';

export const INPUT_HEIGHT_STORAGE_KEY = 'hermes-chat-input-max-height';
export const INPUT_HEIGHT_MIN = 36;
export const INPUT_HEIGHT_DEFAULT = 120;

export function getChatRegionHeight() {
    const chatH = chatBodyEl ? chatBodyEl.clientHeight : 0;
    const inputH = inputAreaEl ? inputAreaEl.clientHeight : 0;
    const region = chatH + inputH;
    if (region > 0) {
        return region;
    }
    return Math.max(window.innerHeight - 120, INPUT_HEIGHT_MIN);
}

export function getInputHeightCeiling() {
    return Math.max(INPUT_HEIGHT_MIN, Math.floor(getChatRegionHeight() * 0.6));
}

export function getInputMaxHeight() {
    const raw = getComputedStyle(inputAreaEl).getPropertyValue('--input-max-height').trim();
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= INPUT_HEIGHT_MIN) {
        return v;
    }
    return INPUT_HEIGHT_DEFAULT;
}

export function getEffectiveInputMaxHeight() {
    return Math.min(getInputMaxHeight(), getInputHeightCeiling());
}

export function syncInputHeightFromContent() {
    const max = getEffectiveInputMaxHeight();
    inputEl.style.height = 'auto';
    const next = Math.min(inputEl.scrollHeight, max);
    inputEl.style.height = next + 'px';
    inputEl.style.overflowY = inputEl.scrollHeight > max ? 'auto' : 'hidden';
}

export function setInputMaxHeight(px, options) {
    const opts = options || {};
    const clamped = Math.max(INPUT_HEIGHT_MIN, Math.min(px, getInputHeightCeiling()));
    inputAreaEl.style.setProperty('--input-max-height', clamped + 'px');
    if (opts.explicit) {
        inputEl.style.height = clamped + 'px';
    } else {
        syncInputHeightFromContent();
    }
    if (opts.persist !== false) {
        try { localStorage.setItem(INPUT_HEIGHT_STORAGE_KEY, String(clamped)); } catch (_) {}
    }
    return clamped;
}

export function initInputHeight() {
    let saved = INPUT_HEIGHT_DEFAULT;
    try {
        const raw = localStorage.getItem(INPUT_HEIGHT_STORAGE_KEY);
        if (raw) saved = parseInt(raw, 10);
    } catch (_) {}
    if (isNaN(saved)) saved = INPUT_HEIGHT_DEFAULT;
    setInputMaxHeight(saved, { persist: false, explicit: false });
}

export function setupInputResize() {
    if (!inputResizeHandle) return;
    let dragging = false;
    let startY = 0;
    let startHeight = 0;

    function endDrag(e) {
        if (!dragging) return;
        dragging = false;
        inputResizeHandle.classList.remove('dragging');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        try { inputResizeHandle.releasePointerCapture(e.pointerId); } catch (_) {}
    }

    inputResizeHandle.addEventListener('pointerdown', function(e) {
        if (e.button !== 0) return;
        dragging = true;
        startY = e.clientY;
        startHeight = inputEl.offsetHeight;
        inputResizeHandle.classList.add('dragging');
        document.body.style.cursor = 'ns-resize';
        document.body.style.userSelect = 'none';
        inputResizeHandle.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    inputResizeHandle.addEventListener('pointermove', function(e) {
        if (!dragging) return;
        setInputMaxHeight(startHeight + (startY - e.clientY), { explicit: true });
    });
    inputResizeHandle.addEventListener('pointerup', endDrag);
    inputResizeHandle.addEventListener('pointercancel', endDrag);
}

export function bindInputHeightResizeListener() {
    window.addEventListener('resize', syncInputHeightFromContent);
}

