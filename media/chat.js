"use strict";
(() => {
  // media/src/core/vscode.js
  var vscode = acquireVsCodeApi();

  // media/src/core/locale.js
  function getLocale() {
    return window.__HERMES_LOCALE__ || {};
  }
  function setLocale(next) {
    window.__HERMES_LOCALE__ = next;
  }

  // media/src/core/dom-refs.js
  var messagesEl = document.getElementById("messages");
  var chatBodyEl = document.getElementById("chat-body");
  var inputEl = document.getElementById("input");
  var inputAreaEl = document.getElementById("input-area");
  var inputCompositeEl = document.getElementById("inputComposite");
  var inputCompositeShellEl = inputCompositeEl ? inputCompositeEl.closest(".input-composite-shell") : null;
  var inputResizeHandle = document.getElementById("inputResizeHandle");
  var sendBtn = document.getElementById("sendBtn");
  var tokenUsageRing = document.getElementById("tokenUsageRing");
  var tokenUsageArc = document.getElementById("tokenUsageArc");
  var tokenUsagePct = document.getElementById("tokenUsagePct");
  var TOKEN_RING_RADIUS = 11;
  var TOKEN_RING_CIRCUMFERENCE = 2 * Math.PI * TOKEN_RING_RADIUS;
  var clearChatBtn = document.getElementById("clearChatBtn");
  var clearInputBtn = document.getElementById("clearInputBtn");
  var copySessionBtn = document.getElementById("copySessionBtn");
  var quickToggleBtn = document.getElementById("quickToggleBtn");
  var inputQuickPanel = document.getElementById("inputQuickPanel");
  var chatSearchInput = document.getElementById("chatSearchInput");
  var chatSearchCount = document.getElementById("chatSearchCount");
  var chatSearchPrev = document.getElementById("chatSearchPrev");
  var chatSearchNext = document.getElementById("chatSearchNext");
  var newChatBtn = document.getElementById("newChatBtn");
  var multiSelectToolbar = document.getElementById("multiSelectToolbar");
  var multiSelectCount = document.getElementById("multiSelectCount");
  var multiSelectAllBtn = document.getElementById("multiSelectAllBtn");
  var multiSelectDeleteBtn = document.getElementById("multiSelectDeleteBtn");
  var multiSelectCopyBtn = document.getElementById("multiSelectCopyBtn");
  var multiSelectExportBtn = document.getElementById("multiSelectExportBtn");
  var multiSelectAttachConfirmBtn = document.getElementById("multiSelectAttachConfirmBtn");
  var multiSelectExitBtn = document.getElementById("multiSelectExitBtn");
  var statusDot = document.getElementById("statusDot");
  var statusText = document.getElementById("statusText");
  var tabBar = document.getElementById("tab-bar");
  var tabContextMenu = document.getElementById("tabContextMenu");
  var filePickerEl = document.getElementById("filePicker");
  var contextAttachPicker = document.getElementById("contextAttachPicker");
  var contextAttachBtn = document.getElementById("contextAttachBtn");
  var contextAttachLabel = document.getElementById("contextAttachLabel");
  var contextAttachDropdown = document.getElementById("contextAttachDropdown");
  var contextAttachList = document.getElementById("contextAttachList");
  var contextAttachHelp = document.getElementById("contextAttachHelp");
  var contextAttachHeaderLead = document.getElementById("contextAttachHeaderLead");
  var contextAttachHeaderRest = document.getElementById("contextAttachHeaderRest");
  var contextAttachTooltipEl = document.getElementById("contextAttachTooltip");
  var contextAttachPreviewEl = document.getElementById("contextAttachPreview");
  var contextAttachPreviewList = document.getElementById("contextAttachPreviewList");
  var contextAttachSendModal = document.getElementById("contextAttachSendModal");
  var SESSION_RENDER_BANNER_ID = "sessionRenderBanner";
  var RESTORE_BATCH_SIZE = 30;
  var MARKDOWN_RENDER_BATCH_SIZE = 4;
  var LOCAL_HISTORY_DIVIDER_ID = "localHistoryDivider";

  // media/src/input/height.js
  var INPUT_HEIGHT_STORAGE_KEY = "hermes-chat-input-max-height";
  var INPUT_HEIGHT_MIN = 36;
  var INPUT_HEIGHT_DEFAULT = 120;
  function getChatRegionHeight() {
    const chatH = chatBodyEl ? chatBodyEl.clientHeight : 0;
    const inputH = inputAreaEl ? inputAreaEl.clientHeight : 0;
    const region = chatH + inputH;
    if (region > 0) {
      return region;
    }
    return Math.max(window.innerHeight - 120, INPUT_HEIGHT_MIN);
  }
  function getInputHeightCeiling() {
    return Math.max(INPUT_HEIGHT_MIN, Math.floor(getChatRegionHeight() * 0.6));
  }
  function getInputMaxHeight() {
    const raw = getComputedStyle(inputAreaEl).getPropertyValue("--input-max-height").trim();
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= INPUT_HEIGHT_MIN) {
      return v;
    }
    return INPUT_HEIGHT_DEFAULT;
  }
  function getEffectiveInputMaxHeight() {
    return Math.min(getInputMaxHeight(), getInputHeightCeiling());
  }
  function syncInputHeightFromContent() {
    const max = getEffectiveInputMaxHeight();
    inputEl.style.height = "auto";
    const next = Math.min(inputEl.scrollHeight, max);
    inputEl.style.height = next + "px";
    inputEl.style.overflowY = inputEl.scrollHeight > max ? "auto" : "hidden";
  }
  function setInputMaxHeight(px, options) {
    const opts = options || {};
    const clamped = Math.max(INPUT_HEIGHT_MIN, Math.min(px, getInputHeightCeiling()));
    inputAreaEl.style.setProperty("--input-max-height", clamped + "px");
    if (opts.explicit) {
      inputEl.style.height = clamped + "px";
    } else {
      syncInputHeightFromContent();
    }
    if (opts.persist !== false) {
      try {
        localStorage.setItem(INPUT_HEIGHT_STORAGE_KEY, String(clamped));
      } catch (_) {
      }
    }
    return clamped;
  }
  function initInputHeight() {
    let saved = INPUT_HEIGHT_DEFAULT;
    try {
      const raw = localStorage.getItem(INPUT_HEIGHT_STORAGE_KEY);
      if (raw) saved = parseInt(raw, 10);
    } catch (_) {
    }
    if (isNaN(saved)) saved = INPUT_HEIGHT_DEFAULT;
    setInputMaxHeight(saved, { persist: false, explicit: false });
  }
  function setupInputResize() {
    if (!inputResizeHandle) return;
    let dragging = false;
    let startY = 0;
    let startHeight = 0;
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      inputResizeHandle.classList.remove("dragging");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        inputResizeHandle.releasePointerCapture(e.pointerId);
      } catch (_) {
      }
    }
    inputResizeHandle.addEventListener("pointerdown", function(e) {
      if (e.button !== 0) return;
      dragging = true;
      startY = e.clientY;
      startHeight = inputEl.offsetHeight;
      inputResizeHandle.classList.add("dragging");
      document.body.style.cursor = "ns-resize";
      document.body.style.userSelect = "none";
      inputResizeHandle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    inputResizeHandle.addEventListener("pointermove", function(e) {
      if (!dragging) return;
      setInputMaxHeight(startHeight + (startY - e.clientY), { explicit: true });
    });
    inputResizeHandle.addEventListener("pointerup", endDrag);
    inputResizeHandle.addEventListener("pointercancel", endDrag);
  }
  function bindInputHeightResizeListener() {
    window.addEventListener("resize", syncInputHeightFromContent);
  }

  // media/src/messages/scroll.js
  var SCROLL_BOTTOM_THRESHOLD = 24;
  var SCROLL_IDLE_MS = 5e3;
  var scrollPinnedByUser = false;
  var scrollIdleTimer = null;
  var isActivelyStreamingFn = () => false;
  function configureScrollStreaming(isActivelyStreaming) {
    isActivelyStreamingFn = isActivelyStreaming;
  }
  function isMessagesAtBottom() {
    if (!messagesEl) {
      return true;
    }
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
  }
  function maybeScrollToBottom(force) {
    if (!messagesEl) {
      return;
    }
    if (force || !scrollPinnedByUser) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }
  function scheduleScrollReenable() {
    if (scrollIdleTimer) {
      clearTimeout(scrollIdleTimer);
    }
    scrollIdleTimer = setTimeout(function() {
      scrollIdleTimer = null;
      if (isActivelyStreamingFn()) {
        scrollPinnedByUser = false;
        maybeScrollToBottom(true);
      }
    }, SCROLL_IDLE_MS);
  }
  function onMessagesScroll() {
    if (!isActivelyStreamingFn()) {
      return;
    }
    if (!isMessagesAtBottom()) {
      scrollPinnedByUser = true;
    }
    scheduleScrollReenable();
  }
  function resetAutoScrollFollow() {
    scrollPinnedByUser = false;
    if (scrollIdleTimer) {
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = null;
    }
  }
  function bindMessagesScrollListener() {
    if (messagesEl) {
      messagesEl.addEventListener("scroll", onMessagesScroll, { passive: true });
    }
  }

  // media/src/core/session-state.js
  function createSessionState() {
    let lastSessions = [];
    let lastActiveSessionId = "";
    let sessionMsgCounter = 0;
    let multiSelectMode = false;
    let multiSelectPurpose = "normal";
    let activeSessionId = "";
    let streamingMessageId = null;
    let thoughtMsgId = null;
    let canSend = false;
    let isPrompting = false;
    let awaitingFirstChunk = false;
    window._showThoughts = true;
    window._showToolCalls = true;
    function isActivelyStreaming() {
      return !!(streamingMessageId || isPrompting);
    }
    function initScrollBehavior() {
      configureScrollStreaming(isActivelyStreaming);
      bindMessagesScrollListener();
    }
    function isMessageForActiveSession(msg) {
      return !msg.sessionId || msg.sessionId === lastActiveSessionId;
    }
    function maybeFocusInputAfterResponse() {
      if (!canSend || inputEl.disabled) {
        return;
      }
      if (!document.hasFocus()) {
        return;
      }
      requestAnimationFrame(function() {
        if (canSend && !inputEl.disabled && document.hasFocus()) {
          inputEl.focus();
        }
      });
    }
    function resetStreamingState() {
      streamingMessageId = null;
      thoughtMsgId = null;
    }
    return {
      getLastSessions: () => lastSessions,
      setLastSessions: (v) => {
        lastSessions = v;
      },
      getLastActiveSessionId: () => lastActiveSessionId,
      setLastActiveSessionId: (v) => {
        lastActiveSessionId = v;
      },
      getSessionMsgCounter: () => sessionMsgCounter,
      bumpSessionIndex: () => sessionMsgCounter++,
      resetSessionIndex: () => {
        sessionMsgCounter = 0;
      },
      getMultiSelectMode: () => multiSelectMode,
      setMultiSelectMode: (v) => {
        multiSelectMode = v;
      },
      getMultiSelectPurpose: () => multiSelectPurpose,
      setMultiSelectPurpose: (v) => {
        multiSelectPurpose = v;
      },
      getActiveSessionId: () => activeSessionId,
      setActiveSessionId: (v) => {
        activeSessionId = v;
      },
      getStreamingMessageId: () => streamingMessageId,
      setStreamingMessageId: (v) => {
        streamingMessageId = v;
      },
      getThoughtMsgId: () => thoughtMsgId,
      setThoughtMsgId: (v) => {
        thoughtMsgId = v;
      },
      getCanSend: () => canSend,
      setCanSend: (v) => {
        canSend = v;
      },
      getIsPrompting: () => isPrompting,
      setIsPrompting: (v) => {
        isPrompting = v;
      },
      getAwaitingFirstChunk: () => awaitingFirstChunk,
      setAwaitingFirstChunk: (v) => {
        awaitingFirstChunk = v;
      },
      initScrollBehavior,
      isMessageForActiveSession,
      maybeFocusInputAfterResponse,
      resetStreamingState
    };
  }

  // media/src/utils/escape-html.js
  function escapeHtml2(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // media/src/detect-environment/steps.js
  var DETECT_STEP_IDS = [
    "config",
    "path_lookup",
    "known_path",
    "pip",
    "python_import",
    "hermes_home",
    "verify",
    "acp_check",
    "acp_install",
    "summary"
  ];
  var DETECT_STEP_LOCALE_KEYS = {
    config: "detectEnvironmentStepConfig",
    path_lookup: "detectEnvironmentStepPath",
    known_path: "detectEnvironmentStepKnownPath",
    pip: "detectEnvironmentStepPip",
    python_import: "detectEnvironmentStepPython",
    hermes_home: "detectEnvironmentStepHermesHome",
    verify: "detectEnvironmentStepVerify",
    acp_check: "detectEnvironmentStepAcpCheck",
    acp_install: "detectEnvironmentStepAcpInstall",
    summary: "detectEnvironmentStepSummary"
  };
  function detectStepLabel(stepId) {
    const key = DETECT_STEP_LOCALE_KEYS[stepId];
    return key ? getLocale()[key] || stepId : stepId;
  }
  function formatDetectStepDetail(msg) {
    if (msg.status === "running") return "\u2026";
    if (msg.status === "skip") return getLocale().detectEnvironmentStepSkipped || "Skipped";
    if (msg.step === "verify") {
      return localeText(
        "detectEnvironmentStepVerifyCount",
        msg.verifiedCount != null ? msg.verifiedCount : 0,
        msg.totalCount != null ? msg.totalCount : 0
      );
    }
    if (msg.step === "acp_check") {
      if (msg.status === "ok") return msg.detail || getLocale().detectEnvironmentStepAcpOk || "";
      if (msg.status === "fail") return msg.detail || getLocale().detectEnvironmentStepAcpFail || "";
    }
    if (msg.step === "acp_install") {
      if (msg.status === "ok") return msg.detail || getLocale().detectEnvironmentStepAcpInstallOk || "";
      if (msg.status === "fail") return msg.detail || getLocale().detectEnvironmentStepAcpInstallFail || "";
    }
    if (msg.step === "summary") {
      if (msg.detail) return msg.detail;
      if (msg.reportStatus === "ready") return getLocale().detectEnvironmentSummaryReady || "";
      if (msg.reportStatus === "broken") return getLocale().detectEnvironmentSummaryBroken || "";
      return getLocale().detectEnvironmentSummaryInstall || getLocale().detectEnvironmentSummaryNotFound || "";
    }
    if (msg.count > 0) {
      const summary = localeText("detectEnvironmentStepFoundCount", msg.count);
      if (msg.detail) return summary + "\n" + msg.detail;
      return summary;
    }
    if (msg.status === "fail" && msg.detail) return msg.detail;
    return getLocale().detectEnvironmentStepNotFound || "Not found";
  }
  function setDetectEnvIcon(el, status) {
    if (!el) return;
    const keepStep = el.classList.contains("detect-env-step-icon");
    el.className = (keepStep ? "detect-env-step-icon " : "") + "detect-env-icon " + (status || "running");
    el.textContent = "";
  }
  function formatDetectProgressDisplay(brief) {
    if (!brief) return "";
    return localeText("detectEnvironmentProgressPrefix", brief);
  }
  function buildDetectStepRow(stepId, rowId) {
    const li = document.createElement("li");
    li.className = "detect-env-step";
    li.id = rowId;
    li.style.display = "none";
    const stepIcon = document.createElement("span");
    stepIcon.className = "detect-env-step-icon detect-env-icon running";
    const body = document.createElement("div");
    body.className = "detect-env-step-body";
    const label = document.createElement("div");
    label.className = "detect-env-step-label";
    label.textContent = detectStepLabel(stepId);
    const detail = document.createElement("div");
    detail.className = "detect-env-step-detail";
    body.appendChild(label);
    body.appendChild(detail);
    li.appendChild(stepIcon);
    li.appendChild(body);
    return li;
  }
  function ensureDetectStepsList(listEl, stepIdPrefix) {
    if (!listEl || listEl.dataset.ready === "1") {
      return;
    }
    listEl.textContent = "";
    DETECT_STEP_IDS.forEach(function(stepId) {
      listEl.appendChild(buildDetectStepRow(stepId, stepIdPrefix + stepId));
    });
    listEl.dataset.ready = "1";
  }
  function refreshDetectStepLabels(listEl, stepIdPrefix) {
    if (!listEl) return;
    DETECT_STEP_IDS.forEach(function(stepId) {
      const label = listEl.querySelector("#" + stepIdPrefix + stepId + " .detect-env-step-label");
      if (label) label.textContent = detectStepLabel(stepId);
    });
  }
  function resetDetectStepsList(stepIdPrefix) {
    DETECT_STEP_IDS.forEach(function(stepId) {
      const row = document.getElementById(stepIdPrefix + stepId);
      if (!row) return;
      row.style.display = "none";
      setDetectEnvIcon(row.querySelector(".detect-env-step-icon"), "running");
      const detailEl = row.querySelector(".detect-env-step-detail");
      if (detailEl) detailEl.textContent = "";
    });
  }
  function updateDetectStepsList(msg, stepIdPrefix, compactIconEl, compactTextEl) {
    const row = document.getElementById(stepIdPrefix + msg.step);
    if (row) {
      row.style.display = "";
      setDetectEnvIcon(row.querySelector(".detect-env-step-icon"), msg.status || "running");
      const detailEl = row.querySelector(".detect-env-step-detail");
      if (detailEl) detailEl.textContent = formatDetectStepDetail(msg);
    }
    if (compactIconEl && compactTextEl && msg.brief) {
      setDetectEnvIcon(compactIconEl, msg.status || "running");
      const text = formatDetectProgressDisplay(msg.brief);
      compactTextEl.textContent = text;
      compactTextEl.title = text;
    }
  }

  // media/src/detect-environment/toolbar.js
  var detectEnvDetailsOpen = false;
  var detectEnvPanelReady = false;
  var detectEnvFinished = false;
  function setDetectEnvDetailsTitle() {
    const detailsTitle = document.getElementById("detectEnvDetailsTitle");
    if (!detailsTitle) return;
    detailsTitle.textContent = detectEnvFinished ? getLocale().detectEnvironmentCompleteTitle || getLocale().detectEnvironmentStepSummary || "" : getLocale().detectEnvironmentDetectTitle || getLocale().detectEnvironment || "";
  }
  function setDetectEnvDetailsOpen(open) {
    detectEnvDetailsOpen = !!open;
    const details = document.getElementById("detectEnvDetails");
    const hint = document.getElementById("detectEnvCompactHint");
    const toggle = document.getElementById("detectEnvToggle");
    if (details) details.hidden = !detectEnvDetailsOpen;
    if (hint) hint.classList.toggle("is-open", detectEnvDetailsOpen);
    if (toggle) {
      toggle.setAttribute("aria-expanded", detectEnvDetailsOpen ? "true" : "false");
      toggle.title = detectEnvDetailsOpen ? getLocale().detectEnvironmentHideDetails || "" : getLocale().detectEnvironmentViewDetails || "";
    }
  }
  function ensureDetectEnvironmentPanel() {
    const list = document.getElementById("detectEnvSteps");
    ensureDetectStepsList(list, "detectStep-");
    if (!detectEnvPanelReady && list) {
      detectEnvPanelReady = true;
    }
  }
  function showDetectEnvironmentBar() {
    ensureDetectEnvironmentPanel();
    const bar = document.getElementById("detectEnvBar");
    if (bar) bar.hidden = false;
  }
  function setDetectEnvironmentCompact(brief, status) {
    setDetectEnvIcon(document.getElementById("detectEnvCompactIcon"), status);
    const textEl = document.getElementById("detectEnvCompactText");
    if (textEl) {
      textEl.textContent = brief || "";
      textEl.title = brief || "";
    }
  }
  function updateDetectEnvironmentStep(msg) {
    ensureDetectEnvironmentPanel();
    updateDetectStepsList(
      msg,
      "detectStep-",
      document.getElementById("detectEnvCompactIcon"),
      document.getElementById("detectEnvCompactText")
    );
  }
  function initDetectEnvironmentStart(mode) {
    detectEnvFinished = false;
    showDetectEnvironmentBar();
    setDetectEnvDetailsOpen(false);
    setDetectEnvDetailsTitle();
    const toggle = document.getElementById("detectEnvToggle");
    if (toggle) {
      toggle.setAttribute("aria-expanded", "false");
      toggle.title = getLocale().detectEnvironmentViewDetails || "";
    }
    DETECT_STEP_IDS.forEach(function(stepId) {
      const row = document.getElementById("detectStep-" + stepId);
      if (!row) return;
      row.style.display = "none";
      setDetectEnvIcon(row.querySelector(".detect-env-step-icon"), "running");
      const detailEl = row.querySelector(".detect-env-step-detail");
      if (detailEl) detailEl.textContent = "";
    });
    setDetectEnvironmentCompact(
      formatDetectProgressDisplay("0%"),
      "running"
    );
  }
  function finishDetectEnvironmentPanel(msg) {
    detectEnvFinished = true;
    setDetectEnvDetailsTitle();
    const summaryMsg = {
      step: "summary",
      status: msg.summaryStatus || (msg.status === "ready" ? "ok" : "fail"),
      reportStatus: msg.status,
      brief: msg.brief
    };
    updateDetectEnvironmentStep(summaryMsg);
    setDetectEnvironmentCompact(formatDetectProgressDisplay(msg.brief || "100%"), summaryMsg.status);
  }

  // media/src/detect-environment/bind-events.js
  function doDetectEnvironment() {
    vscode.postMessage({ type: "detectEnvironment" });
  }
  function bindDetectToolbarEvents(detectEnvBtn2, detectEnvClose) {
    const detectEnvToggle = document.getElementById("detectEnvToggle");
    if (detectEnvToggle) {
      detectEnvToggle.addEventListener("click", function(e) {
        e.stopPropagation();
        setDetectEnvDetailsOpen(!detectEnvDetailsOpen);
        detectEnvToggle.setAttribute("aria-expanded", detectEnvDetailsOpen ? "true" : "false");
      });
    }
    if (detectEnvClose) {
      detectEnvClose.addEventListener("click", function(e) {
        e.stopPropagation();
        hideDetectEnvironmentBar();
        vscode.postMessage({ type: "detectEnvironmentDismiss" });
      });
    }
    if (detectEnvBtn2) detectEnvBtn2.addEventListener("click", doDetectEnvironment);
  }

  // media/src/connection/index.js
  function createConnection(deps) {
    let connectionAttempted = false;
    const retryBtn = document.getElementById("retryBtn");
    const detectEnvBtn2 = document.getElementById("detectEnvBtn");
    function updateConnectionActionVisibility(status) {
      const showActions = status === "error" || status === "idle" && connectionAttempted;
      if (retryBtn) {
        retryBtn.hidden = !showActions;
        retryBtn.disabled = status === "connecting";
      }
      if (detectEnvBtn2) {
        detectEnvBtn2.hidden = !showActions;
        detectEnvBtn2.disabled = status === "connecting";
      }
    }
    function buildConnectionErrorPlaceholder(errText) {
      const locale = deps.getLocale();
      const placeholder2 = deps.getPlaceholder();
      if (placeholder2) placeholder2.className = "placeholder";
      return escapeHtml2(errText) + '<div class="connection-error-actions" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button type="button" class="retry-btn" id="placeholderRetryBtn">' + escapeHtml2(locale.retryConnect) + '</button><button type="button" class="retry-btn" id="placeholderDetectEnvBtn">' + escapeHtml2(locale.detectEnvironment) + "</button></div>";
    }
    function bindConnectionErrorActions() {
      const phRetry = document.getElementById("placeholderRetryBtn");
      if (phRetry) phRetry.addEventListener("click", doRetry);
      const phDetect = document.getElementById("placeholderDetectEnvBtn");
      if (phDetect) phDetect.addEventListener("click", doDetectEnvironment);
    }
    function doRetry() {
      if (retryBtn && retryBtn.disabled) return;
      connectionAttempted = true;
      vscode.postMessage({ type: "retry" });
    }
    function updateStatus(status, message) {
      const locale = deps.getLocale();
      statusDot.className = "dot " + status;
      const labels = {
        idle: locale.statusDisconnected,
        connecting: locale.statusConnecting,
        ready: locale.statusReady,
        prompting: locale.statusThinking,
        error: locale.statusError
      };
      let text = message || labels[status] || status;
      if (text.startsWith("Session:")) {
        text = labels[status] || status;
      }
      statusText.textContent = text;
      statusText.title = message || text;
      updateConnectionActionVisibility(status);
    }
    function bindConnectionEvents() {
      if (retryBtn) {
        retryBtn.addEventListener("click", doRetry);
      }
    }
    return {
      getConnectionAttempted: () => connectionAttempted,
      setConnectionAttempted: (v) => {
        connectionAttempted = v;
      },
      updateStatus,
      buildConnectionErrorPlaceholder,
      bindConnectionErrorActions,
      bindConnectionEvents
    };
  }

  // media/src/ui/modal.js
  function showModal(el) {
    if (el) el.classList.add("is-open");
  }
  function hideModal(el) {
    if (el) el.classList.remove("is-open");
  }

  // media/src/locale/faq.js
  function buildFaqAccordion(container) {
    if (!container || container.querySelector(".faq-list")) {
      return;
    }
    const nodes = Array.from(container.childNodes);
    const wrapper = document.createElement("div");
    wrapper.className = "faq-list";
    let i = 0;
    while (i < nodes.length) {
      const node = nodes[i];
      if (node.nodeType === 1 && node.tagName === "H3") {
        const details = document.createElement("details");
        details.className = "faq-item";
        if (wrapper.childElementCount === 0) {
          details.open = true;
        }
        const summary = document.createElement("summary");
        summary.className = "faq-summary";
        summary.textContent = node.textContent;
        const body = document.createElement("div");
        body.className = "faq-body";
        i += 1;
        while (i < nodes.length && !(nodes[i].nodeType === 1 && nodes[i].tagName === "H3")) {
          body.appendChild(nodes[i]);
          i += 1;
        }
        details.appendChild(summary);
        details.appendChild(body);
        wrapper.appendChild(details);
      } else if (node.nodeType === 3 && !node.textContent.trim()) {
        i += 1;
      } else {
        i += 1;
      }
    }
    if (wrapper.childElementCount > 0) {
      container.textContent = "";
      container.appendChild(wrapper);
    }
  }

  // media/src/ui/info-modals.js
  function createInfoModals(deps) {
    const aboutModal = document.getElementById("aboutModal");
    const helpModal = document.getElementById("helpModal");
    const faqModal = document.getElementById("faqModal");
    const faqModalBody = document.getElementById("faqModalBody");
    const aboutContent = document.getElementById("aboutContent");
    let pluginInfo = {};
    function renderAboutContent() {
      const locale = deps.getLocale();
      const name = pluginInfo.displayName || "Rina Hermes ACP";
      const version = pluginInfo.version || "\u2014";
      const publisher = pluginInfo.publisher || "";
      const repo = pluginInfo.repository || "";
      const iconUri = pluginInfo.iconUri || "";
      const logoHtml = iconUri ? '<div class="about-brand"><img src="' + escapeHtml2(iconUri) + '" alt="' + escapeHtml2(name) + '" /></div>' : "";
      aboutContent.innerHTML = logoHtml + "<h3>" + escapeHtml2(name) + "</h3><p>" + locale.aboutVersion + " <code>" + escapeHtml2(version) + "</code>" + (publisher ? " \xB7 " + escapeHtml2(publisher) : "") + "</p><p>" + locale.aboutDescription + "</p><ul><li>" + escapeHtml2(locale.aboutFeatureTabs) + "</li><li>" + escapeHtml2(locale.aboutFeaturePickers) + "</li><li>" + escapeHtml2(locale.aboutFeatureInsert) + "</li><li>" + escapeHtml2(locale.aboutFeatureTools) + "</li></ul>" + (repo ? '<p class="dim">' + escapeHtml2(locale.repository) + '\uFF1A<a href="#" data-url="' + escapeHtml2(repo) + '">' + escapeHtml2(repo) + "</a></p>" : "");
      aboutContent.querySelectorAll("a[data-url]").forEach(function(link) {
        link.addEventListener("click", function(e) {
          e.preventDefault();
          vscode.postMessage({ type: "openExternal", url: link.dataset.url });
        });
      });
    }
    function closeInfoModals() {
      hideModal(aboutModal);
      hideModal(helpModal);
      hideModal(faqModal);
    }
    function applyInfoModalLocale() {
      const locale = deps.getLocale();
      const aboutModalTitle = document.getElementById("aboutModalTitle");
      if (aboutModalTitle) aboutModalTitle.textContent = locale.aboutTitle;
      const helpModalTitle = document.getElementById("helpModalTitle");
      if (helpModalTitle) helpModalTitle.textContent = locale.helpTitle;
      const helpModalBody = document.getElementById("helpModalBody");
      if (helpModalBody) helpModalBody.innerHTML = locale.helpHtml;
      const faqModalTitle = document.getElementById("faqModalTitle");
      if (faqModalTitle) faqModalTitle.textContent = locale.faqTitle;
      if (faqModalBody) {
        faqModalBody.innerHTML = locale.faqHtml || "";
        buildFaqAccordion(faqModalBody);
      }
    }
    function bindInfoModalEvents() {
      document.querySelectorAll(".close-info-modal").forEach(function(btn) {
        btn.addEventListener("click", closeInfoModals);
      });
      aboutModal.addEventListener("click", function(e) {
        if (e.target === aboutModal) closeInfoModals();
      });
      helpModal.addEventListener("click", function(e) {
        if (e.target === helpModal) closeInfoModals();
      });
      faqModal.addEventListener("click", function(e) {
        if (e.target === faqModal) closeInfoModals();
      });
      if (faqModalBody) {
        faqModalBody.addEventListener("toggle", function(e) {
          const item = e.target;
          if (!item.classList || !item.classList.contains("faq-item") || !item.open) {
            return;
          }
          const list = item.closest(".faq-list");
          if (!list) {
            return;
          }
          list.querySelectorAll(".faq-item[open]").forEach(function(other) {
            if (other !== item) {
              other.open = false;
            }
          });
        }, true);
        faqModalBody.addEventListener("click", function(e) {
          const link = e.target.closest("a[data-url]");
          if (!link) return;
          e.preventDefault();
          vscode.postMessage({ type: "openExternal", url: link.dataset.url });
        });
      }
    }
    function setPluginInfo(info) {
      pluginInfo = info || {};
    }
    return {
      aboutModal,
      helpModal,
      faqModal,
      renderAboutContent,
      closeInfoModals,
      applyInfoModalLocale,
      bindInfoModalEvents,
      setPluginInfo
    };
  }

  // media/src/utils/clipboard.js
  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(function() {
        fallbackCopyToClipboard(text);
      });
    }
    fallbackCopyToClipboard(text);
    return Promise.resolve();
  }
  function fallbackCopyToClipboard(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }

  // media/src/log/viewer.js
  var LOG_SCROLL_BOTTOM_THRESHOLD = 24;
  var LOG_SCROLL_IDLE_MS = 5e3;
  function createLogViewer(deps) {
    let logs = [];
    const logFilterError = document.getElementById("logFilterError");
    const logFilterWarning = document.getElementById("logFilterWarning");
    const logModal = document.getElementById("logModal");
    const logContent = document.getElementById("logContent");
    const copyLogBtn = document.getElementById("copyLogBtn");
    let logScrollPinnedByUser = false;
    let logScrollIdleTimer = null;
    let copyLogResetTimer = null;
    function isLogModalOpen() {
      return !!(logModal && logModal.classList.contains("is-open"));
    }
    function isLogAtBottom() {
      if (!logContent) {
        return true;
      }
      return logContent.scrollHeight - logContent.scrollTop - logContent.clientHeight <= LOG_SCROLL_BOTTOM_THRESHOLD;
    }
    function maybeScrollLogToBottom(force) {
      if (!logContent) {
        return;
      }
      if (force || !logScrollPinnedByUser) {
        logContent.scrollTop = logContent.scrollHeight;
      }
    }
    function scheduleLogScrollReenable() {
      if (logScrollIdleTimer) {
        clearTimeout(logScrollIdleTimer);
      }
      logScrollIdleTimer = setTimeout(function() {
        logScrollIdleTimer = null;
        logScrollPinnedByUser = false;
        maybeScrollLogToBottom(true);
      }, LOG_SCROLL_IDLE_MS);
    }
    function onLogContentScroll() {
      if (!isLogModalOpen()) {
        return;
      }
      if (isLogAtBottom()) {
        logScrollPinnedByUser = false;
        if (logScrollIdleTimer) {
          clearTimeout(logScrollIdleTimer);
          logScrollIdleTimer = null;
        }
        return;
      }
      logScrollPinnedByUser = true;
      scheduleLogScrollReenable();
    }
    function resetLogAutoScrollFollow() {
      logScrollPinnedByUser = false;
      if (logScrollIdleTimer) {
        clearTimeout(logScrollIdleTimer);
        logScrollIdleTimer = null;
      }
    }
    function getVisibleLogText() {
      const showError = !logFilterError || logFilterError.checked;
      const showWarning = !logFilterWarning || logFilterWarning.checked;
      return logs.filter(function(entry) {
        if (entry.level === "error") return showError;
        if (entry.level === "warning") return showWarning;
        return false;
      }).map(function(entry) {
        return entry.line;
      }).join("\n");
    }
    function renderLogContent() {
      const locale = deps.getLocale();
      const showError = !logFilterError || logFilterError.checked;
      const showWarning = !logFilterWarning || logFilterWarning.checked;
      const visible = logs.filter(function(entry) {
        if (entry.level === "error") return showError;
        if (entry.level === "warning") return showWarning;
        return false;
      });
      if (!visible.length) {
        logContent.textContent = locale.noLogs;
        return;
      }
      logContent.textContent = "";
      for (const entry of visible) {
        const lineEl = document.createElement("div");
        lineEl.className = entry.level === "error" ? "log-line-error" : "log-line-warning";
        lineEl.textContent = entry.line;
        logContent.appendChild(lineEl);
      }
      maybeScrollLogToBottom();
    }
    function openLogModal() {
      resetLogAutoScrollFollow();
      renderLogContent();
      showModal(logModal);
      maybeScrollLogToBottom(true);
    }
    function appendLog(line, level) {
      logs.push({ line, level });
      if (logs.length > 500) logs = logs.slice(-500);
      if (isLogModalOpen()) {
        renderLogContent();
      }
    }
    function bindLogViewerEvents() {
      if (copyLogBtn) {
        copyLogBtn.addEventListener("click", function() {
          const locale = deps.getLocale();
          const text = getVisibleLogText();
          if (!text) return;
          copyToClipboard(text).then(function() {
            copyLogBtn.classList.add("copied");
            const prevText = copyLogBtn.textContent;
            copyLogBtn.textContent = locale.copied;
            if (copyLogResetTimer) clearTimeout(copyLogResetTimer);
            copyLogResetTimer = setTimeout(function() {
              copyLogBtn.classList.remove("copied");
              copyLogBtn.textContent = prevText || locale.copy;
            }, 1500);
          });
        });
      }
      const closeLogBtn = document.getElementById("closeLogBtn");
      if (closeLogBtn) {
        closeLogBtn.addEventListener("click", function() {
          hideModal(logModal);
        });
      }
      const clearLogBtn = document.getElementById("clearLogBtn");
      if (clearLogBtn) {
        clearLogBtn.addEventListener("click", function() {
          logs = [];
          renderLogContent();
        });
      }
      if (logFilterError) logFilterError.addEventListener("change", renderLogContent);
      if (logFilterWarning) logFilterWarning.addEventListener("change", renderLogContent);
      if (logContent) {
        logContent.addEventListener("scroll", onLogContentScroll, { passive: true });
      }
    }
    return {
      openLogModal,
      appendLog,
      bindLogViewerEvents
    };
  }

  // media/src/input/send.js
  function createSend(deps) {
    function executeSendMessage(text, attachOverride) {
      deps.hideFilePicker();
      resetAutoScrollFollow();
      deps.addMessage("user", text);
      inputEl.value = "";
      deps.syncInputHeightFromContent();
      deps.updateQuickActionBtns();
      inputEl.disabled = true;
      deps.setAwaitingFirstChunk(true);
      deps.setInputMode("waiting");
      const payload = attachOverride !== void 0 ? attachOverride : deps.buildContextAttachPayload(false);
      vscode.postMessage({
        type: "sendMessage",
        text,
        contextAttach: payload
      });
    }
    function sendMessage() {
      const text = inputEl.value.trim();
      if (!text || !deps.getCanSend()) return;
      if (deps.hasUnconfirmedCustomMemorySelection()) {
        deps.openContextAttachSendModal(text);
        return;
      }
      executeSendMessage(text);
    }
    function bindSendEvents() {
      inputEl.addEventListener("keydown", function(e) {
        if (e.key === "Escape" && deps.getMultiSelectMode()) {
          e.preventDefault();
          deps.exitMultiSelectMode();
          return;
        }
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          sendMessage();
        }
      });
      sendBtn.addEventListener("click", sendMessage);
    }
    return { executeSendMessage, sendMessage, bindSendEvents };
  }
  function createInputMode(deps) {
    const cancelBtn = document.getElementById("cancelBtn");
    function setInputMode(mode) {
      const waiting = mode === "stop" || mode === "waiting";
      if (inputCompositeEl) {
        inputCompositeEl.classList.toggle("waiting", waiting);
      }
      if (inputCompositeShellEl) {
        inputCompositeShellEl.classList.toggle("waiting", waiting);
      }
      if (mode === "stop") {
        sendBtn.classList.add("hidden");
        cancelBtn.classList.remove("hidden");
        sendBtn.disabled = true;
      } else if (mode === "waiting") {
        cancelBtn.classList.add("hidden");
        sendBtn.classList.remove("hidden");
        sendBtn.disabled = true;
      } else if (mode === "send") {
        cancelBtn.classList.add("hidden");
        sendBtn.classList.remove("hidden");
        sendBtn.disabled = !deps.getCanSend();
      } else {
        cancelBtn.classList.add("hidden");
        sendBtn.classList.remove("hidden");
        sendBtn.disabled = true;
      }
    }
    return { setInputMode };
  }

  // media/src/sessions/switch-modal.js
  function createSwitchSessionModal(deps) {
    const switchSessionModal = document.getElementById("switchSessionModal");
    let pendingSwitchSessionId = null;
    function openSwitchSessionModal(sessionId) {
      const locale = deps.getLocale();
      pendingSwitchSessionId = sessionId;
      const titleEl = document.getElementById("switchSessionModalTitle");
      const bodyEl = document.getElementById("switchSessionModalBody");
      const stayBtn = document.getElementById("switchSessionStayBtn");
      const confirmBtn = document.getElementById("switchSessionConfirmBtn");
      if (titleEl) titleEl.textContent = locale.switchSessionPromptTitle || "";
      if (bodyEl) bodyEl.textContent = locale.switchSessionPromptBody || "";
      if (stayBtn) stayBtn.textContent = locale.switchSessionStay || "";
      if (confirmBtn) confirmBtn.textContent = locale.switchSessionConfirm || "";
      showModal(switchSessionModal);
    }
    function closeSwitchSessionModal() {
      pendingSwitchSessionId = null;
      hideModal(switchSessionModal);
    }
    function requestSwitchSession(sessionId) {
      if (!sessionId || sessionId === deps.getActiveSessionId()) {
        return;
      }
      if (deps.getIsPrompting()) {
        openSwitchSessionModal(sessionId);
        return;
      }
      vscode.postMessage({ type: "switchSession", sessionId });
    }
    function bindSwitchSessionEvents() {
      const stayBtn = document.getElementById("switchSessionStayBtn");
      const confirmBtn = document.getElementById("switchSessionConfirmBtn");
      if (stayBtn) {
        stayBtn.addEventListener("click", closeSwitchSessionModal);
      }
      if (confirmBtn) {
        confirmBtn.addEventListener("click", function() {
          if (!pendingSwitchSessionId) {
            closeSwitchSessionModal();
            return;
          }
          const sessionId = pendingSwitchSessionId;
          closeSwitchSessionModal();
          vscode.postMessage({ type: "switchSession", sessionId, interrupt: true });
        });
      }
      if (switchSessionModal) {
        switchSessionModal.addEventListener("click", function(e) {
          if (e.target === switchSessionModal) {
            closeSwitchSessionModal();
          }
        });
      }
    }
    return { requestSwitchSession, bindSwitchSessionEvents };
  }

  // media/src/messages/group-utils.js
  function isSelectableRole(role) {
    return role === "user" || role === "assistant" || role === "thought" || role === "tool";
  }
  function getGroupRoleLabel(group, locale) {
    if (group.classList.contains("user")) return locale.roleYou;
    if (group.classList.contains("assistant")) return locale.roleHermes;
    if (group.classList.contains("thought")) return locale.roleThought;
    if (group.classList.contains("tool")) return locale.roleTool;
    return locale.roleMessage;
  }
  function downloadSessionMarkdown(markdown, filename) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "chat-export.md";
    link.click();
    URL.revokeObjectURL(url);
  }
  function createGroupUtils(deps) {
    function assignSessionIndex(group) {
      group.dataset.sessionIndex = String(deps.bumpSessionIndex());
    }
    function reindexSessionIndices() {
      deps.resetSessionIndex();
      messagesEl.querySelectorAll(".message-group").forEach(function(group) {
        assignSessionIndex(group);
      });
    }
    function getGroupMarkdownText(group) {
      if (group._auxState && group._auxState.rawText) {
        return group._auxState.rawText;
      }
      if (group._rawText) {
        return group._rawText;
      }
      return deps.getMessagePlainText(group);
    }
    function getGroupsPlainText(groups) {
      const locale = deps.getLocale();
      const lines = [];
      groups.forEach(function(group) {
        const role = getGroupRoleLabel(group, locale);
        const text = deps.getMessagePlainText(group).trim();
        if (!text) return;
        lines.push(role + ":\n" + text);
      });
      return lines.join("\n\n");
    }
    function getGroupsMarkdown(groups) {
      const locale = deps.getLocale();
      const parts = [];
      groups.forEach(function(group) {
        const role = getGroupRoleLabel(group, locale);
        const text = getGroupMarkdownText(group).trim();
        if (!text) return;
        parts.push("## " + role + "\n\n" + text);
      });
      return parts.join("\n\n");
    }
    function getSessionPlainText() {
      const locale = deps.getLocale();
      const groups = messagesEl.querySelectorAll(".message-group");
      const lines = [];
      groups.forEach(function(group) {
        const role = getGroupRoleLabel(group, locale);
        const text = deps.getMessagePlainText(group).trim();
        if (!text) return;
        lines.push(role + ":\n" + text);
      });
      return lines.join("\n\n");
    }
    function requestSessionExport(action, indices, sessionId) {
      const sid = sessionId || deps.getLastActiveSessionId();
      if (!sid) return;
      vscode.postMessage({
        type: "sessionExport",
        sessionId: sid,
        action,
        indices: indices && indices.length ? indices : void 0
      });
    }
    return {
      assignSessionIndex,
      reindexSessionIndices,
      getGroupMarkdownText,
      getGroupsPlainText,
      getGroupsMarkdown,
      getSessionPlainText,
      requestSessionExport
    };
  }

  // media/src/app/bootstrap/create-group-utils-bundle.js
  function createGroupUtilsBundle(ctx) {
    let messages;
    const groupUtils = createGroupUtils({
      getLocale: ctx.getLocale,
      getMessagePlainText: (...a) => messages.getMessagePlainText(...a),
      getLastActiveSessionId: ctx.session.getLastActiveSessionId,
      bumpSessionIndex: ctx.session.bumpSessionIndex,
      resetSessionIndex: ctx.session.resetSessionIndex
    });
    return {
      groupUtils,
      bindMessagesRef(ref) {
        messages = ref;
      },
      assignSessionIndex: groupUtils.assignSessionIndex,
      reindexSessionIndices: groupUtils.reindexSessionIndices,
      requestSessionExport: groupUtils.requestSessionExport
    };
  }

  // media/src/messages/markdown.js
  function renderMarkdown(text) {
    const html = marked.parse(text);
    if (typeof DOMPurify !== "undefined") {
      return DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i
      });
    }
    const div = document.createElement("div");
    div.innerHTML = html;
    div.querySelectorAll("*").forEach(function(n) {
      if (!n.attributes) return;
      for (let i = n.attributes.length - 1; i >= 0; i--) {
        const attr = n.attributes[i];
        if (attr.name.startsWith("on") || attr.name === "href" && attr.value.toLowerCase().startsWith("javascript:")) {
          n.removeAttribute(attr.name);
        }
      }
    });
    return div.innerHTML;
  }

  // media/src/messages/auxiliary.js
  var THOUGHT_COLLAPSED_LINES = 5;
  var TOOL_COLLAPSED_LINES = 3;
  var AUX_LINE_HEIGHT_EM = 1.35;
  var TOOL_SHORT_MAX_LINES = 3;
  var TOOL_AGGREGATE_MAX_LINES = 12;
  var TOOL_AGGREGATE_SEPARATOR = "\n\n---\n\n";
  function createAuxiliaryMessages(deps) {
    const toolCallMap = {};
    let toolAggregateGroupId = null;
    function getAuxCollapsedLines(role) {
      return role === "thought" ? THOUGHT_COLLAPSED_LINES : TOOL_COLLAPSED_LINES;
    }
    function getAuxCollapsedMaxHeight(role) {
      return AUX_LINE_HEIGHT_EM * getAuxCollapsedLines(role) + "em";
    }
    function auxDetailOverflows(scrollEl, text, maxLines) {
      if (!scrollEl) return false;
      if (text && text.split("\n").length > maxLines) return true;
      return scrollEl.scrollHeight > scrollEl.clientHeight + 1;
    }
    function syncAuxiliaryDetailView(group) {
      const state = group._auxState;
      if (!state || !state.scrollEl) return;
      const maxLines = getAuxCollapsedLines(state.role);
      state.scrollEl.classList.toggle("is-collapsed", !state.detailExpanded);
      state.scrollEl.classList.toggle("is-expanded", state.detailExpanded);
      if (!state.detailExpanded) {
        state.scrollEl.style.maxHeight = getAuxCollapsedMaxHeight(state.role);
        state.scrollEl.scrollTop = state.scrollEl.scrollHeight;
      } else {
        state.scrollEl.style.maxHeight = "";
      }
      const overflow = auxDetailOverflows(state.scrollEl, state.rawText, maxLines);
      state.moreBtn.hidden = state.detailExpanded || !overflow;
      state.lessBtn.hidden = !state.detailExpanded || !overflow;
    }
    function countNonemptyLines(text) {
      const trimmed = (text || "").trim();
      if (!trimmed) return 0;
      return trimmed.split("\n").filter(function(line) {
        return line.trim().length > 0;
      }).length;
    }
    function isShortToolText(text) {
      return countNonemptyLines(text) <= TOOL_SHORT_MAX_LINES;
    }
    function isAggregatedToolText(text) {
      return (text || "").indexOf("---") >= 0;
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
      state.rawText = text || "";
      state.contentEl.innerHTML = renderMarkdown(state.rawText);
      deps.setupContentBlocks(state.contentEl);
      deps.processFileRefs(state.contentEl);
      syncAuxiliaryDetailView(group);
    }
    function rebuildAggregateToolContent(group) {
      const state = group._auxState;
      if (!state || !state.aggregatedTools || !state.aggregatedTools.length) return;
      const merged = state.aggregatedTools.map(function(entry) {
        return entry.text.trim();
      }).filter(Boolean).join(TOOL_AGGREGATE_SEPARATOR);
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
      const firstText = state.rawText || "";
      Object.keys(toolCallMap).forEach(function(id) {
        if (toolCallMap[id] === group.id && !firstId) {
          firstId = id;
        }
      });
      state.aggregatedTools = [{
        toolCallId: firstId || "tool_" + group.id,
        text: firstText
      }];
    }
    function clearAllToolLive() {
      Object.keys(toolCallMap).forEach(function(key) {
        const group = document.getElementById(toolCallMap[key]);
        const msg = group && group.querySelector(".message.tool");
        if (msg) msg.classList.remove("is-live");
      });
    }
    function setAuxMessageLive(group, live) {
      if (!group) return;
      const msg = group.querySelector(".message.thought, .message.tool");
      if (msg) msg.classList.toggle("is-live", live);
    }
    function finalizeAuxiliaryBubble(group) {
      if (!group || !group._auxState) return;
      setAuxiliaryContent(group, group._auxState.rawText);
    }
    function buildAuxiliaryMessage(role, text) {
      const locale = deps.getLocale();
      const div = document.createElement("div");
      div.className = "message " + role;
      const header = document.createElement("div");
      header.className = "aux-header";
      const label = document.createElement("div");
      label.className = "label aux-label";
      label.textContent = role === "thought" ? locale.roleThought : locale.roleTool;
      header.appendChild(label);
      div.appendChild(header);
      const wrap = document.createElement("div");
      wrap.className = "aux-body-wrap";
      const scrollEl = document.createElement("div");
      scrollEl.className = "aux-body-scroll is-collapsed";
      const contentEl = document.createElement("div");
      contentEl.className = "aux-body-content";
      scrollEl.appendChild(contentEl);
      wrap.appendChild(scrollEl);
      const controls = document.createElement("div");
      controls.className = "aux-body-controls";
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "aux-body-toggle";
      moreBtn.textContent = locale.permissionShowMore || "Show more";
      const lessBtn = document.createElement("button");
      lessBtn.type = "button";
      lessBtn.className = "aux-body-toggle";
      lessBtn.textContent = locale.permissionCollapse || "Collapse";
      lessBtn.hidden = true;
      controls.appendChild(moreBtn);
      controls.appendChild(lessBtn);
      wrap.appendChild(controls);
      div.appendChild(wrap);
      return { div, scrollEl, contentEl, moreBtn, lessBtn, role, rawText: text || "" };
    }
    function wireAuxiliaryMessage(group, parts, deferMarkdown) {
      const state = {
        role: parts.role,
        rawText: parts.rawText,
        detailExpanded: false,
        scrollEl: parts.scrollEl,
        contentEl: parts.contentEl,
        moreBtn: parts.moreBtn,
        lessBtn: parts.lessBtn
      };
      group._auxState = state;
      parts.moreBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        state.detailExpanded = true;
        syncAuxiliaryDetailView(group);
      });
      parts.lessBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        state.detailExpanded = false;
        syncAuxiliaryDetailView(group);
      });
      if (deferMarkdown) {
        state.contentEl.textContent = parts.rawText || "";
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
        if (group && group._auxState && canAggregateToolTexts(group._auxState.rawText || "", text)) {
          ensureAggregateEntries(group);
          group._auxState.aggregatedTools.push({ toolCallId, text });
          rebuildAggregateToolContent(group);
          toolCallMap[toolCallId] = toolAggregateGroupId;
          setAuxMessageLive(group, true);
          deps.enableStopAfterAgentOutput();
          deps.maybeScrollToBottom();
          return;
        }
      }
      const id = deps.addMessage("tool", text);
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
      document.querySelectorAll(".message-group.thought, .message-group.tool").forEach(function(group) {
        if (!group._auxState) return;
        group._auxState.moreBtn.textContent = locale.permissionShowMore || "Show more";
        group._auxState.lessBtn.textContent = locale.permissionCollapse || "Collapse";
        const labelEl = group.querySelector(".aux-label");
        if (labelEl) {
          labelEl.textContent = group._auxState.role === "thought" ? locale.roleThought : locale.roleTool;
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
      refreshAllAuxiliaryLocale
    };
  }

  // media/src/search/chat-search.js
  function createChatSearch(deps) {
    const chatSearchState = {
      query: "",
      matches: [],
      current: -1,
      timer: null
    };
    function getMessageContentEl(group) {
      const bubble = group.querySelector(".message") || group;
      return bubble.querySelector(".content") || bubble.querySelector(".aux-body-content");
    }
    function clearSearchMarks() {
      document.querySelectorAll("mark.search-mark").forEach(function(mark) {
        const text = document.createTextNode(mark.textContent);
        mark.parentNode.replaceChild(text, mark);
      });
      document.querySelectorAll(".message-group").forEach(function(group) {
        group.classList.remove("search-hit", "search-hit-active");
      });
    }
    function wrapTextRange(root, start, end, active) {
      if (!root || start >= end) return;
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let offset = 0;
      let node;
      while (node = walker.nextNode()) {
        const text = node.textContent || "";
        const nodeStart = offset;
        const nodeEnd = offset + text.length;
        if (nodeEnd <= start) {
          offset = nodeEnd;
          continue;
        }
        if (nodeStart >= end) break;
        const localStart = Math.max(0, start - nodeStart);
        const localEnd = Math.min(text.length, end - nodeStart);
        const before = text.slice(0, localStart);
        const middle = text.slice(localStart, localEnd);
        const after = text.slice(localEnd);
        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        const mark = document.createElement("mark");
        mark.className = active ? "search-mark search-mark-active" : "search-mark";
        mark.textContent = middle;
        frag.appendChild(mark);
        if (after) frag.appendChild(document.createTextNode(after));
        node.parentNode.replaceChild(frag, node);
        break;
      }
    }
    function updateChatSearchUI() {
      const total = chatSearchState.matches.length;
      const hasQuery2 = !!chatSearchState.query;
      if (chatSearchCount) {
        if (!hasQuery2) {
          chatSearchCount.textContent = "";
          chatSearchCount.classList.remove("no-match");
        } else if (total === 0) {
          chatSearchCount.textContent = "0/0";
          chatSearchCount.classList.add("no-match");
        } else {
          chatSearchCount.textContent = chatSearchState.current + 1 + "/" + total;
          chatSearchCount.classList.remove("no-match");
        }
      }
      const canNav = total > 0;
      if (chatSearchPrev) chatSearchPrev.disabled = !canNav;
      if (chatSearchNext) chatSearchNext.disabled = !canNav;
    }
    function applyChatSearchHighlight() {
      clearSearchMarks();
      if (chatSearchState.current < 0 || !chatSearchState.matches.length) {
        updateChatSearchUI();
        return;
      }
      chatSearchState.matches.forEach(function(match) {
        match.group.classList.add("search-hit");
      });
      const active = chatSearchState.matches[chatSearchState.current];
      active.group.classList.add("search-hit-active");
      const byRoot = /* @__PURE__ */ new Map();
      chatSearchState.matches.forEach(function(match, idx) {
        const contentEl = getMessageContentEl(match.group);
        if (!contentEl) return;
        if (!byRoot.has(contentEl)) byRoot.set(contentEl, []);
        byRoot.get(contentEl).push({
          start: match.start,
          end: match.end,
          active: idx === chatSearchState.current
        });
      });
      byRoot.forEach(function(ranges, root) {
        ranges.sort(function(a, b) {
          return b.start - a.start;
        });
        ranges.forEach(function(range) {
          wrapTextRange(root, range.start, range.end, range.active);
        });
      });
      active.group.scrollIntoView({ block: "center", behavior: "smooth" });
      updateChatSearchUI();
    }
    function runChatSearch() {
      if (!chatSearchInput) return;
      const query = chatSearchInput.value.trim();
      chatSearchState.query = query;
      chatSearchState.matches = [];
      chatSearchState.current = -1;
      clearSearchMarks();
      if (!query) {
        updateChatSearchUI();
        return;
      }
      const needle = query.toLowerCase();
      messagesEl.querySelectorAll(".message-group").forEach(function(group) {
        const text = deps.getMessagePlainText(group);
        const haystack = text.toLowerCase();
        let idx = 0;
        while ((idx = haystack.indexOf(needle, idx)) !== -1) {
          chatSearchState.matches.push({
            group,
            start: idx,
            end: idx + query.length
          });
          idx += needle.length || 1;
        }
      });
      if (chatSearchState.matches.length > 0) {
        chatSearchState.current = 0;
        applyChatSearchHighlight();
      } else {
        updateChatSearchUI();
      }
    }
    function scheduleChatSearch() {
      if (chatSearchState.timer) clearTimeout(chatSearchState.timer);
      chatSearchState.timer = setTimeout(function() {
        chatSearchState.timer = null;
        runChatSearch();
      }, 150);
    }
    function clearChatSearch() {
      if (chatSearchState.timer) {
        clearTimeout(chatSearchState.timer);
        chatSearchState.timer = null;
      }
      if (chatSearchInput) chatSearchInput.value = "";
      chatSearchState.query = "";
      chatSearchState.matches = [];
      chatSearchState.current = -1;
      clearSearchMarks();
      updateChatSearchUI();
    }
    function gotoChatSearchMatch(delta) {
      const total = chatSearchState.matches.length;
      if (!total) return;
      chatSearchState.current = (chatSearchState.current + delta + total) % total;
      applyChatSearchHighlight();
    }
    function hasQuery() {
      return !!chatSearchState.query;
    }
    function bindChatSearchEvents() {
      if (chatSearchInput) {
        chatSearchInput.addEventListener("input", scheduleChatSearch);
        chatSearchInput.addEventListener("keydown", function(e) {
          if (e.key === "ArrowUp") {
            e.preventDefault();
            gotoChatSearchMatch(-1);
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            gotoChatSearchMatch(1);
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (e.shiftKey) gotoChatSearchMatch(-1);
            else gotoChatSearchMatch(1);
          } else if (e.key === "Escape") {
            e.preventDefault();
            clearChatSearch();
          }
        });
      }
      if (chatSearchPrev) {
        chatSearchPrev.addEventListener("click", function() {
          gotoChatSearchMatch(-1);
        });
      }
      if (chatSearchNext) {
        chatSearchNext.addEventListener("click", function() {
          gotoChatSearchMatch(1);
        });
      }
    }
    return {
      scheduleChatSearch,
      clearChatSearch,
      gotoChatSearchMatch,
      hasQuery,
      bindChatSearchEvents
    };
  }

  // media/src/messages/session-render.js
  function createSessionRender(deps) {
    let sessionRenderJobId = 0;
    function showSessionRenderBanner() {
      if (!chatBodyEl) return;
      const locale = deps.getLocale();
      let banner = document.getElementById(SESSION_RENDER_BANNER_ID);
      if (!banner) {
        banner = document.createElement("div");
        banner.id = SESSION_RENDER_BANNER_ID;
        banner.className = "session-render-banner";
        banner.setAttribute("role", "status");
        banner.setAttribute("aria-live", "polite");
        banner.innerHTML = '<span class="session-render-spinner" aria-hidden="true"></span><span class="session-render-text"></span>';
        chatBodyEl.appendChild(banner);
      }
      banner.classList.remove("is-hiding");
      const textEl = banner.querySelector(".session-render-text");
      if (textEl) textEl.textContent = locale.sessionRendering || "";
      banner.hidden = false;
    }
    function forceHideSessionRenderBanner() {
      const banner = document.getElementById(SESSION_RENDER_BANNER_ID);
      if (!banner) return;
      banner.classList.remove("is-hiding");
      banner.hidden = true;
    }
    function hideSessionRenderBanner() {
      const banner = document.getElementById(SESSION_RENDER_BANNER_ID);
      if (!banner || banner.hidden || banner.classList.contains("is-hiding")) return;
      banner.classList.add("is-hiding");
      const onExitEnd = function(e) {
        if (e.target !== banner || e.animationName !== "session-render-exit") return;
        banner.removeEventListener("animationend", onExitEnd);
        banner.hidden = true;
        banner.classList.remove("is-hiding");
      };
      banner.addEventListener("animationend", onExitEnd);
    }
    function cancelSessionMarkdownRender() {
      sessionRenderJobId++;
      forceHideSessionRenderBanner();
    }
    function collectMarkdownRenderTargets() {
      const targets = [];
      messagesEl.querySelectorAll(".message-group").forEach(function(group) {
        if (group.id === LOCAL_HISTORY_DIVIDER_ID) return;
        const assistantContent = group.querySelector(".message.assistant .content");
        if (assistantContent) {
          const text = group._rawText || assistantContent.textContent || "";
          if (text.trim()) {
            targets.push({ kind: "assistant", el: assistantContent, text, group });
          }
        }
        if (group._auxState && group._auxState.contentEl) {
          const text = group._auxState.rawText || group._auxState.contentEl.textContent || "";
          if (text.trim()) {
            targets.push({ kind: "aux", group, text });
          }
        }
      });
      return targets;
    }
    function renderMarkdownTarget(target) {
      if (target.kind === "assistant") {
        target.group._rawText = target.text;
        target.el.innerHTML = renderMarkdown(target.text);
        deps.setupContentBlocks(target.el);
        deps.processFileRefs(target.el);
        return;
      }
      if (target.kind === "aux") {
        deps.setAuxiliaryContent(target.group, target.text);
      }
    }
    function scheduleSessionMarkdownRender() {
      const jobId = ++sessionRenderJobId;
      const targets = collectMarkdownRenderTargets();
      if (!targets.length) {
        hideSessionRenderBanner();
        window._hermesRendered = true;
        if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
        return;
      }
      showSessionRenderBanner();
      let index = 0;
      function runBatch() {
        if (jobId !== sessionRenderJobId) return;
        const end = Math.min(index + MARKDOWN_RENDER_BATCH_SIZE, targets.length);
        for (; index < end; index++) {
          renderMarkdownTarget(targets[index]);
        }
        if (index < targets.length) {
          requestAnimationFrame(runBatch);
        } else {
          hideSessionRenderBanner();
          window._hermesRendered = true;
          if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
        }
      }
      requestAnimationFrame(runBatch);
    }
    return {
      cancelSessionMarkdownRender,
      scheduleSessionMarkdownRender
    };
  }

  // media/src/input/file-refs.js
  function createFileRefs(deps) {
    const filePickerEl2 = deps.filePickerEl;
    let mentionStart = -1;
    let filePickerVisible = false;
    let filePickerItems = [];
    let filePickerIndex = 0;
    let fileListRequestId = 0;
    let fileListDebounce = null;
    let previewTooltip = null;
    let previewHideTimer = null;
    let previewRequestId = 0;
    const previewRequests = /* @__PURE__ */ new Map();
    function hideFilePreview() {
      if (previewHideTimer) {
        clearTimeout(previewHideTimer);
        previewHideTimer = null;
      }
      if (previewTooltip) {
        previewTooltip.remove();
        previewTooltip = null;
      }
    }
    function showFilePreview(path, content, error) {
      const locale = deps.getLocale();
      hideFilePreview();
      previewTooltip = document.createElement("div");
      previewTooltip.className = "file-preview-tooltip";
      const header = document.createElement("div");
      header.className = "fp-header";
      header.textContent = path;
      previewTooltip.appendChild(header);
      if (error) {
        const err = document.createElement("div");
        err.className = "fp-error";
        err.textContent = error;
        previewTooltip.appendChild(err);
      } else {
        const pre = document.createElement("pre");
        pre.textContent = content || locale.emptyFile;
        previewTooltip.appendChild(pre);
      }
      document.body.appendChild(previewTooltip);
    }
    function positionFilePreview(anchor) {
      if (!previewTooltip || !anchor) return;
      const rect = anchor.getBoundingClientRect();
      const tip = previewTooltip.getBoundingClientRect();
      let top = rect.bottom + 6;
      let left = rect.left;
      if (top + tip.height > window.innerHeight - 8) {
        top = rect.top - tip.height - 6;
      }
      if (left + tip.width > window.innerWidth - 8) {
        left = window.innerWidth - tip.width - 8;
      }
      previewTooltip.style.top = Math.max(8, top) + "px";
      previewTooltip.style.left = Math.max(8, left) + "px";
    }
    function attachFileRefPreview(link) {
      if (link.dataset.previewReady) return;
      link.dataset.previewReady = "1";
      let enterTimer = null;
      link.addEventListener("mouseenter", function() {
        enterTimer = setTimeout(function() {
          const filePath = link.dataset.path || link.textContent.replace(/^@/, "");
          const reqId = String(++previewRequestId);
          previewRequests.set(reqId, link);
          vscode.postMessage({ type: "previewFile", path: filePath, requestId: reqId });
        }, 250);
      });
      link.addEventListener("mouseleave", function() {
        if (enterTimer) clearTimeout(enterTimer);
        previewHideTimer = setTimeout(hideFilePreview, 150);
      });
    }
    function processFileRefs(container) {
      const locale = deps.getLocale();
      if (!container) return;
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null, false);
      const nodesToReplace = [];
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node.parentElement && node.parentElement.closest("pre, code, a.file-ref")) continue;
        const text = node.textContent || "";
        const refRegex = /@([\w./\\\-]+(?:\.[a-zA-Z0-9]+)?)/g;
        let match;
        let lastIdx = 0;
        const parts = [];
        while ((match = refRegex.exec(text)) !== null) {
          const before = text.slice(lastIdx, match.index);
          if (before) parts.push(document.createTextNode(before));
          const link = document.createElement("a");
          link.href = "#";
          link.className = "file-ref";
          link.textContent = match[0];
          link.title = locale.fileLinkTitle;
          link.dataset.path = match[1];
          link.addEventListener("click", function(e) {
            e.preventDefault();
            vscode.postMessage({ type: "openFile", path: match[1] });
          });
          attachFileRefPreview(link);
          parts.push(link);
          lastIdx = match.index + match[0].length;
        }
        if (parts.length > 0) {
          const remaining = text.slice(lastIdx);
          if (remaining) parts.push(document.createTextNode(remaining));
          nodesToReplace.push({ node, parts });
        }
      }
      for (const { node, parts } of nodesToReplace) {
        const parent = node.parentNode;
        if (!parent) continue;
        const fragment = document.createDocumentFragment();
        parts.forEach((p) => fragment.appendChild(p));
        parent.replaceChild(fragment, node);
      }
    }
    function hideFilePicker() {
      if (!filePickerEl2) return;
      filePickerVisible = false;
      mentionStart = -1;
      filePickerItems = [];
      filePickerIndex = 0;
      filePickerEl2.classList.remove("visible");
      filePickerEl2.innerHTML = "";
    }
    function renderFilePickerItems(files) {
      const locale = deps.getLocale();
      filePickerItems = files || [];
      filePickerIndex = 0;
      filePickerEl2.innerHTML = "";
      if (filePickerItems.length === 0) {
        const empty = document.createElement("div");
        empty.className = "file-picker-empty";
        empty.textContent = locale.noMatchingFiles;
        filePickerEl2.appendChild(empty);
      } else {
        filePickerItems.forEach(function(filePath, idx) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "file-picker-item" + (idx === 0 ? " active" : "");
          btn.textContent = "@" + filePath;
          btn.addEventListener("mousedown", function(e) {
            e.preventDefault();
            selectFileMention(filePath);
          });
          filePickerEl2.appendChild(btn);
        });
      }
      filePickerEl2.classList.add("visible");
      filePickerVisible = true;
    }
    function updateFilePickerHighlight() {
      filePickerEl2.querySelectorAll(".file-picker-item").forEach(function(el, idx) {
        el.classList.toggle("active", idx === filePickerIndex);
        if (idx === filePickerIndex) {
          el.scrollIntoView({ block: "nearest" });
        }
      });
    }
    function selectFileMention(filePath) {
      if (mentionStart < 0) return;
      const val = inputEl.value;
      const before = val.slice(0, mentionStart);
      const after = val.slice(inputEl.selectionStart);
      const insertion = "@" + filePath + " ";
      inputEl.value = before + insertion + after;
      const cursor = before.length + insertion.length;
      inputEl.setSelectionRange(cursor, cursor);
      deps.syncInputHeightFromContent();
      hideFilePicker();
      inputEl.focus();
    }
    function detectFileMention() {
      const locale = deps.getLocale();
      const val = inputEl.value;
      const pos = inputEl.selectionStart;
      const before = val.slice(0, pos);
      const match = before.match(/@([\w./\\\-]*)$/);
      if (!match) {
        hideFilePicker();
        return;
      }
      mentionStart = pos - match[0].length;
      const query = match[1] || "";
      if (fileListDebounce) clearTimeout(fileListDebounce);
      fileListDebounce = setTimeout(function() {
        const reqId = String(++fileListRequestId);
        filePickerEl2.dataset.requestId = reqId;
        filePickerEl2.innerHTML = '<div class="file-picker-empty">' + escapeHtml2(locale.searchingFiles) + "</div>";
        filePickerEl2.classList.add("visible");
        filePickerVisible = true;
        vscode.postMessage({ type: "listFiles", query, requestId: reqId });
      }, 120);
    }
    function isFilePickerVisible() {
      return filePickerVisible;
    }
    function getFilePickerItems() {
      return filePickerItems;
    }
    function getFilePickerIndex() {
      return filePickerIndex;
    }
    function setFilePickerIndex(idx) {
      filePickerIndex = idx;
    }
    function getFilePickerRequestId() {
      return filePickerEl2.dataset.requestId;
    }
    function bindFilePickerInputHandlers() {
      inputEl.addEventListener("input", function() {
        deps.syncInputHeightFromContent();
        detectFileMention();
        deps.updateQuickActionBtns();
      });
      inputEl.addEventListener("keydown", function(e) {
        if (filePickerVisible && filePickerItems.length > 0) {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            filePickerIndex = (filePickerIndex + 1) % filePickerItems.length;
            updateFilePickerHighlight();
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            filePickerIndex = (filePickerIndex - 1 + filePickerItems.length) % filePickerItems.length;
            updateFilePickerHighlight();
            return;
          }
          if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            selectFileMention(filePickerItems[filePickerIndex]);
            return;
          }
        }
        if (e.key === "Escape" && filePickerVisible) {
          e.preventDefault();
          hideFilePicker();
        }
      });
    }
    return {
      previewRequests,
      processFileRefs,
      hideFilePicker,
      hideFilePreview,
      showFilePreview,
      positionFilePreview,
      renderFilePickerItems,
      detectFileMention,
      isFilePickerVisible,
      getFilePickerItems,
      getFilePickerIndex,
      setFilePickerIndex,
      getFilePickerRequestId,
      bindFilePickerInputHandlers
    };
  }

  // media/src/ui/icons.js
  var COPY_ICON_SVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4 2h8a1 1 0 0 1 1 1v1h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h0zm1 2v8h8V5H5zm-2 2h1v6h6v1H4a1 1 0 0 1-1-1V6h0z"/></svg>';
  var TAB_PIN_SVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M9.2 1.3 11.5 3.6V6l2.2 2.1v1.2H10v4.2L9 14H7L6 13.5V9.3H2.3V8.1L4.5 6V3.6L6.8 1.3h2.4zm-.9 1.4H7.7L5.9 4.5V6.4L4.3 8h7.4L10.1 6.4V4.5L8.3 2.7z"/></svg>';
  var SELECT_ICON_SVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2zm0 4.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V7zm0 4.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2z"/><path d="M3.15 4.85l.7-.7 1 1 2-2 .7.7-2.7 2.7-1.7-1.7z"/><path d="M3.15 9.35l.7-.7 1 1 2-2 .7.7-2.7 2.7-1.7-1.7z"/><path d="M7.5 3h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1zm0 4.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1zm0 4.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1z"/></svg>';
  var CHEVRON_DOWN_SVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 6 8 9.5 11.5 6l.7.7L8 10.9l-4.2-4.2.7-.7z"/></svg>';

  // media/src/messages/add-message.js
  function createAddMessage(deps) {
    function getMessagePlainText(group) {
      const bubble = group.querySelector(".message") || group;
      const content = bubble.querySelector(".content");
      if (content) return content.textContent || "";
      const aux = bubble.querySelector(".aux-body-content");
      if (aux) return aux.textContent || "";
      return "";
    }
    function attachMessageActions(group, inner) {
      const locale = deps.getLocale();
      const actions = document.createElement("div");
      actions.className = "message-actions";
      actions.addEventListener("click", function(e) {
        e.stopPropagation();
      });
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "copy-btn action-btn";
      copyBtn.title = locale.copy;
      copyBtn.innerHTML = COPY_ICON_SVG;
      copyBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        const text = getMessagePlainText(group);
        if (!text) return;
        copyToClipboard(text).then(function() {
          copyBtn.classList.add("copied");
          copyBtn.title = locale.copied;
          setTimeout(function() {
            copyBtn.classList.remove("copied");
            copyBtn.title = locale.copy;
          }, 1500);
        });
      });
      actions.appendChild(copyBtn);
      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.className = "select-btn action-btn";
      selectBtn.title = locale.selectMessages;
      selectBtn.innerHTML = SELECT_ICON_SVG;
      selectBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        deps.enterMultiSelectMode(group);
      });
      actions.appendChild(selectBtn);
      inner.appendChild(actions);
    }
    function addMessage(role, text, options) {
      const locale = deps.getLocale();
      const restoring = options && options.restore;
      deps.placeholder.style.display = "none";
      const streamingMessageId = deps.getStreamingMessageId();
      if (!restoring && role === "assistant" && streamingMessageId) {
        const last = document.getElementById(streamingMessageId);
        if (last) {
          last.querySelector(".content").textContent = text;
          last._rawText = text;
          if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
          deps.maybeScrollToBottom();
          return;
        }
      }
      const id = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
      const group = document.createElement("div");
      group.className = "message-group " + role;
      group.id = id;
      if (deps.isSelectableRole(role)) {
        group.classList.add("selectable");
        const selectWrap = document.createElement("label");
        selectWrap.className = "msg-select-wrap";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.addEventListener("click", function(e) {
          e.stopPropagation();
        });
        checkbox.addEventListener("change", function() {
          deps.setGroupSelected(group, checkbox.checked);
        });
        selectWrap.appendChild(checkbox);
        group.appendChild(selectWrap);
        deps.wireSelectableGroup(group);
      }
      deps.assignSessionIndex(group);
      const inner = document.createElement("div");
      inner.className = "message-group-inner";
      let div;
      let auxParts = null;
      if (role === "tool" || role === "thought") {
        auxParts = deps.buildAuxiliaryMessage(role, text);
        div = auxParts.div;
        if (!restoring) {
          div.classList.add("is-live");
        }
      } else {
        div = document.createElement("div");
        div.className = "message " + role;
        const label = document.createElement("div");
        label.className = "label";
        label.textContent = role === "user" ? locale.roleYou : locale.roleHermes;
        div.appendChild(label);
        const content = document.createElement("div");
        content.className = "content";
        content.textContent = text;
        div.appendChild(content);
        group._rawText = text;
        if (role === "user") {
          deps.processFileRefs(content);
        }
      }
      if (role === "assistant" && !restoring) {
        deps.resetToolAggregation();
        div.classList.add("streaming");
        deps.setStreamingMessageId(id);
        deps.clearAllToolLive();
        deps.enableStopAfterAgentOutput();
      }
      if (role === "assistant") {
        group._rawText = text;
      }
      inner.appendChild(div);
      if (auxParts) {
        deps.wireAuxiliaryMessage(group, auxParts, !!(restoring && options && options.deferMarkdown));
      }
      if (!restoring && role === "thought") {
        deps.resetToolAggregation();
      }
      if (!restoring && (role === "thought" || role === "tool")) {
        deps.enableStopAfterAgentOutput();
      }
      attachMessageActions(group, inner);
      group.appendChild(inner);
      messagesEl.appendChild(group);
      if (role === "thought" && !window._showThoughts) group.style.display = "none";
      if (role === "tool" && !window._showToolCalls) group.style.display = "none";
      deps.updateQuickActionBtns();
      if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
      deps.maybeScrollToBottom();
      return id;
    }
    function finalizeAssistantBubble() {
      const thoughtMsgId = deps.getThoughtMsgId();
      if (thoughtMsgId) {
        const thoughtGroup = document.getElementById(thoughtMsgId);
        deps.setAuxMessageLive(thoughtGroup, false);
        deps.finalizeAuxiliaryBubble(thoughtGroup);
        deps.setThoughtMsgId(null);
      }
      deps.clearAllToolLive();
      const streamingMessageId = deps.getStreamingMessageId();
      if (streamingMessageId) {
        const group = document.getElementById(streamingMessageId);
        const el = group ? group.querySelector(".message") : null;
        if (el) {
          el.classList.remove("streaming");
          const text = el.querySelector(".content").textContent;
          if (group) group._rawText = text;
          el.querySelector(".content").innerHTML = renderMarkdown(text);
          deps.setupContentBlocks(el.querySelector(".content"));
          deps.processFileRefs(el.querySelector(".content"));
        }
        deps.setStreamingMessageId(null);
      }
      if (deps.chatSearchHasQuery()) deps.scheduleChatSearch();
    }
    function enableStopAfterAgentOutput() {
      if (!deps.getAwaitingFirstChunk()) {
        return;
      }
      deps.setAwaitingFirstChunk(false);
      if (deps.getIsPrompting()) {
        deps.setInputMode("stop");
      }
    }
    function finishStreaming() {
      finalizeAssistantBubble();
      if (deps.getIsPrompting() && deps.getAwaitingFirstChunk()) {
        deps.setInputMode("waiting");
      } else {
        deps.setInputMode(deps.getIsPrompting() ? "stop" : deps.getCanSend() ? "send" : "disabled");
      }
    }
    return {
      getMessagePlainText,
      addMessage,
      finalizeAssistantBubble,
      enableStopAfterAgentOutput,
      finishStreaming
    };
  }

  // media/src/context-attach/index.js
  function createContextAttach(deps) {
    let contextAttachVisible = false;
    let contextAttachMode = "none";
    let contextAttachCustomIndices = [];
    let contextAttachCustomPending = false;
    let contextAttachCustomConfirmed = false;
    let contextAttachUnconfirmedIndices = [];
    let contextAttachPreviewOpen = false;
    let contextAttachPickerHiding = false;
    let contextAttachHasChoice = false;
    let pendingSendText = "";
    function resetContextAttachPickerElement() {
      if (contextAttachPicker) {
        contextAttachPicker.hidden = true;
        contextAttachPicker.classList.remove("is-hiding", "is-entering", "is-attention");
      }
      contextAttachPickerHiding = false;
    }
    function forceHideContextAttachPicker() {
      contextAttachVisible = false;
      contextAttachMode = "none";
      contextAttachCustomIndices = [];
      contextAttachCustomPending = false;
      contextAttachCustomConfirmed = false;
      contextAttachUnconfirmedIndices = [];
      contextAttachHasChoice = false;
      pendingSendText = "";
      if (deps.getMultiSelectPurpose() === "contextAttach") {
        deps.exitMultiSelectMode();
      }
      resetContextAttachPickerElement();
      deps.closeAllDropdowns();
    }
    function finishHideContextAttachPicker() {
      contextAttachVisible = false;
      contextAttachMode = "none";
      contextAttachCustomIndices = [];
      contextAttachCustomPending = false;
      contextAttachCustomConfirmed = false;
      contextAttachUnconfirmedIndices = [];
      contextAttachHasChoice = false;
      pendingSendText = "";
      if (deps.getMultiSelectPurpose() === "contextAttach") {
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
      contextAttachPicker.classList.remove("is-entering", "is-attention");
      contextAttachPicker.classList.add("is-hiding");
      hideContextAttachPreview();
      const onExitEnd = function(e) {
        if (e.target !== contextAttachPicker || e.animationName !== "context-attach-exit") {
          return;
        }
        contextAttachPicker.removeEventListener("animationend", onExitEnd);
        finishHideContextAttachPicker();
      };
      contextAttachPicker.addEventListener("animationend", onExitEnd);
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
      contextAttachTooltipEl.style.left = left + "px";
      contextAttachTooltipEl.style.top = top + "px";
    }
    function showContextAttachTooltip() {
      if (!contextAttachHelp || !contextAttachTooltipEl) {
        return;
      }
      contextAttachTooltipEl.textContent = deps.getLocale().contextAttachTooltip || contextAttachHelp.getAttribute("aria-label") || "";
      contextAttachTooltipEl.hidden = false;
      contextAttachTooltipEl.style.left = "-9999px";
      contextAttachTooltipEl.style.top = "0";
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
      contextAttachHelp.addEventListener("mouseenter", showContextAttachTooltip);
      contextAttachHelp.addEventListener("mouseleave", hideContextAttachTooltip);
      contextAttachHelp.addEventListener("focus", showContextAttachTooltip);
      contextAttachHelp.addEventListener("blur", hideContextAttachTooltip);
    }
    function getContextAttachRegionGroups() {
      const divider = document.getElementById(LOCAL_HISTORY_DIVIDER_ID);
      const groups = [];
      messagesEl.querySelectorAll(".message-group").forEach(function(group) {
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
      if (group.classList.contains("selectable")) {
        return;
      }
      group.classList.add("selectable", "context-attach-extra-selectable");
      const selectWrap = document.createElement("label");
      selectWrap.className = "msg-select-wrap";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.addEventListener("click", function(e) {
        e.stopPropagation();
      });
      checkbox.addEventListener("change", function() {
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
      messagesEl.querySelectorAll(".message-group.context-attach-extra-selectable").forEach(function(group) {
        group.classList.remove("selectable", "context-attach-extra-selectable", "is-selected");
        const wrap = group.querySelector(".msg-select-wrap");
        if (wrap) {
          wrap.remove();
        }
        if (group.dataset.contextAttachReveal === "1") {
          group.style.display = "none";
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
        const idx = parseInt(group.dataset.sessionIndex || "", 10);
        updates.push({
          group,
          selected: Number.isInteger(idx) && indexSet.has(idx)
        });
      });
      deps.setGroupsSelected(updates);
    }
    function getCustomContextAttachSelectionCount() {
      if (contextAttachCustomConfirmed) {
        return contextAttachCustomIndices.length;
      }
      if (deps.getMultiSelectMode() && deps.getMultiSelectPurpose() === "contextAttach") {
        return deps.getSelectedMessageIndices().length;
      }
      if (contextAttachCustomPending || contextAttachUnconfirmedIndices.length > 0) {
        return getUnconfirmedCustomSelectionIndices().length;
      }
      return 0;
    }
    function getContextAttachCountLabel(count) {
      return (deps.getLocale().contextAttachSelected || "\u9644\u5E26\u4E0A\u8F6E\u5DF2\u9009{0}\u6761\u8BB0\u5FC6").replace("{0}", String(count));
    }
    function getContextAttachOptionLabel(mode) {
      switch (mode) {
        case "last2":
          return deps.getLocale().contextAttachLast2;
        case "last10":
          return deps.getLocale().contextAttachLast10;
        case "all":
          return deps.getLocale().contextAttachAll;
        case "custom": {
          const count = getCustomContextAttachSelectionCount();
          if (count > 0) {
            return getContextAttachCountLabel(count);
          }
          if (contextAttachCustomPending || contextAttachCustomConfirmed || contextAttachHasChoice) {
            return deps.getLocale().contextAttachCustomNone || "\u60A8\u6CA1\u6709\u9009\u62E9\u4EFB\u4F55\u8BB0\u5FC6";
          }
          return deps.getLocale().contextAttachCustom;
        }
        case "none":
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
      const isPlaceholder = contextAttachMode === "none" && !contextAttachHasChoice;
      contextAttachLabel.textContent = getContextAttachOptionLabel(contextAttachMode);
      contextAttachBtn.classList.toggle("is-placeholder", isPlaceholder);
      contextAttachBtn.title = isPlaceholder ? deps.getLocale().contextAttachPlaceholder || "" : getContextAttachOptionLabel(contextAttachMode);
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
      if (group.classList.contains("permission")) {
        return deps.getLocale().permissionTitle || "Permission";
      }
      if (group.classList.contains("thought")) {
        return deps.getLocale().roleThought || "Thought";
      }
      if (group.classList.contains("tool")) {
        return deps.getLocale().roleTool || "Tool";
      }
      return getGroupRoleLabel(group, deps.getLocale());
    }
    function getGroupPreviewText(group) {
      if (group.classList.contains("permission") && group._permissionState && group._permissionState.text) {
        return group._permissionState.text.trim();
      }
      if (group._auxState && group._auxState.rawText) {
        return group._auxState.rawText.trim();
      }
      return deps.getMessagePlainText(group).trim();
    }
    function isAttachableMemoryGroup(group) {
      return group.classList.contains("user") || group.classList.contains("assistant") || group.classList.contains("permission");
    }
    function getAttachableMemoryGroups() {
      return getContextAttachRegionGroups().filter(isAttachableMemoryGroup);
    }
    function resolveAttachPreviewGroups() {
      if (!contextAttachVisible || contextAttachMode === "none") {
        return [];
      }
      const attachable = getAttachableMemoryGroups();
      if (contextAttachMode === "last2") {
        return attachable.slice(-2);
      }
      if (contextAttachMode === "last10") {
        return attachable.slice(-10);
      }
      if (contextAttachMode === "all") {
        return attachable.slice();
      }
      if (contextAttachMode === "custom") {
        let indices = [];
        if (contextAttachCustomConfirmed) {
          indices = contextAttachCustomIndices;
        } else if (deps.getMultiSelectMode() && deps.getMultiSelectPurpose() === "contextAttach") {
          indices = deps.getSelectedMessageIndices();
        } else {
          indices = contextAttachUnconfirmedIndices;
        }
        if (!indices.length) {
          return [];
        }
        const byIndex = /* @__PURE__ */ new Map();
        messagesEl.querySelectorAll(".message-group").forEach(function(group) {
          const idx = parseInt(group.dataset.sessionIndex || "", 10);
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
      const parts = [deps.getLocale().contextAttachPrefixHeader || "", "---"];
      groups.forEach(function(group) {
        parts.push(getGroupPreviewRoleLabel(group));
        parts.push(getGroupPreviewText(group));
      });
      const text = parts.join("\n");
      let weight = 0;
      for (let i = 0; i < text.length; i++) {
        weight += text.charCodeAt(i) > 11903 ? 0.55 : 0.25;
      }
      return Math.max(1, Math.ceil(weight));
    }
    function updateContextAttachPreviewTitle(count, tokens) {
      const titleEl = document.getElementById("contextAttachPreviewTitle");
      if (!titleEl) {
        return;
      }
      const template = deps.getLocale().contextAttachPreviewTitle || "({0} / ~{1})";
      titleEl.textContent = template.replace("{0}", String(count)).replace("{1}", String(tokens));
    }
    function renderContextAttachPreviewContent() {
      if (!contextAttachPreviewList) {
        return;
      }
      const groups = resolveAttachPreviewGroups();
      if (!groups.length) {
        contextAttachPreviewList.innerHTML = "";
        updateContextAttachPreviewTitle(0, 0);
        return;
      }
      updateContextAttachPreviewTitle(groups.length, estimateContextAttachInputTokens(groups));
      contextAttachPreviewList.innerHTML = groups.map(function(group) {
        const role = escapeHtml(getGroupPreviewRoleLabel(group));
        const text = escapeHtml(getGroupPreviewText(group) || "\u2014");
        return '<li class="context-attach-preview-item"><span class="context-attach-preview-role">' + role + '</span><span class="context-attach-preview-text">' + text + "</span></li>";
      }).join("");
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
      contextAttachPreviewEl.style.left = left + "px";
      contextAttachPreviewEl.style.top = top + "px";
    }
    function showContextAttachPreview() {
      if (!contextAttachVisible || !contextAttachBtn || !contextAttachPreviewEl) {
        return;
      }
      if (contextAttachPicker && contextAttachPicker.classList.contains("is-open")) {
        return;
      }
      if (!hasContextAttachSelection()) {
        return;
      }
      renderContextAttachPreviewContent();
      contextAttachPreviewOpen = true;
      contextAttachPreviewEl.hidden = false;
      contextAttachPreviewEl.style.left = "-9999px";
      contextAttachPreviewEl.style.top = "0";
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
      contextAttachBtn.addEventListener("mouseenter", function() {
        showContextAttachPreview();
      });
      contextAttachBtn.addEventListener("mousedown", function() {
        hideContextAttachPreview();
      });
      const contextAttachPreviewClose = document.getElementById("contextAttachPreviewClose");
      if (contextAttachPreviewClose) {
        contextAttachPreviewClose.addEventListener("click", function(e) {
          e.stopPropagation();
          hideContextAttachPreview();
        });
      }
      document.addEventListener("pointerdown", function(e) {
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
        { mode: "none", label: deps.getLocale().contextAttachNone },
        { mode: "last2", label: deps.getLocale().contextAttachLast2 },
        { mode: "last10", label: deps.getLocale().contextAttachLast10 },
        { mode: "all", label: deps.getLocale().contextAttachAll },
        { mode: "custom", label: deps.getLocale().contextAttachCustom }
      ];
      contextAttachList.innerHTML = options.map(function(opt) {
        const isActive = opt.mode === contextAttachMode && (opt.mode !== "none" || contextAttachHasChoice);
        const active = isActive ? " active" : "";
        return '<div class="dropdown-item' + active + '" data-attach-mode="' + escapeHtml(opt.mode) + '">' + escapeHtml(opt.label) + (isActive ? " \u2713" : "") + "</div>";
      }).join("");
      contextAttachList.querySelectorAll(".dropdown-item[data-attach-mode]").forEach(function(item) {
        item.addEventListener("click", function(e) {
          e.stopPropagation();
          const mode = this.dataset.attachMode;
          if (mode === "custom") {
            contextAttachHasChoice = true;
            enterContextAttachSelectMode();
            return;
          }
          if (deps.getMultiSelectPurpose() === "contextAttach") {
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
      contextAttachMode = "none";
      contextAttachCustomIndices = [];
      contextAttachCustomPending = false;
      contextAttachCustomConfirmed = false;
      contextAttachUnconfirmedIndices = [];
      contextAttachHasChoice = false;
      hideContextAttachPreview();
      if (contextAttachPicker) {
        contextAttachPicker.classList.remove("is-hiding", "is-entering", "is-attention");
        contextAttachPicker.hidden = false;
        contextAttachPicker.classList.add("is-entering", "is-attention");
        const onPickerAnimEnd = function(e) {
          if (e.target !== contextAttachPicker || e.animationName !== "context-attach-enter") {
            return;
          }
          contextAttachPicker.classList.remove("is-entering");
          contextAttachPicker.removeEventListener("animationend", onPickerAnimEnd);
        };
        contextAttachPicker.addEventListener("animationend", onPickerAnimEnd);
        if (contextAttachBtn) {
          const onAttentionEnd = function(e) {
            if (e.target !== contextAttachBtn || e.animationName !== "context-attach-attention-pulse") {
              return;
            }
            contextAttachPicker.classList.remove("is-attention");
            contextAttachBtn.removeEventListener("animationend", onAttentionEnd);
          };
          contextAttachBtn.addEventListener("animationend", onAttentionEnd);
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
      contextAttachMode = "custom";
      deps.closeAllDropdowns();
      ensureContextAttachSelectableTargets();
      deps.enterMultiSelectMode(null, "contextAttach");
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
      contextAttachMode = "custom";
      contextAttachCustomConfirmed = true;
      contextAttachCustomPending = false;
      contextAttachHasChoice = true;
      deps.exitMultiSelectMode();
      updateContextAttachButtonLabel();
      renderContextAttachOptions();
    }
    function getUnconfirmedCustomSelectionIndices() {
      if (deps.getMultiSelectMode() && deps.getMultiSelectPurpose() === "contextAttach") {
        return deps.getSelectedMessageIndices();
      }
      return contextAttachUnconfirmedIndices.slice();
    }
    function hasUnconfirmedCustomMemorySelection() {
      if (!contextAttachVisible || contextAttachCustomConfirmed) {
        return false;
      }
      if (contextAttachMode !== "custom" && !contextAttachCustomPending) {
        return false;
      }
      return getUnconfirmedCustomSelectionIndices().length > 0;
    }
    function buildContextAttachPayload(forceNoAttach) {
      if (!contextAttachVisible) {
        return void 0;
      }
      if (forceNoAttach) {
        return { mode: "none" };
      }
      if (contextAttachCustomConfirmed && contextAttachMode === "custom") {
        return {
          mode: "custom",
          indices: contextAttachCustomIndices.slice()
        };
      }
      if (contextAttachMode === "none") {
        return { mode: "none" };
      }
      if (contextAttachMode === "custom" && !contextAttachCustomConfirmed) {
        return { mode: "none" };
      }
      return {
        mode: contextAttachMode,
        indices: void 0
      };
    }
    function finalizeContextAttachSelectionFromPending() {
      const indices = getUnconfirmedCustomSelectionIndices();
      if (!indices.length) {
        return false;
      }
      contextAttachCustomIndices = indices.slice();
      contextAttachUnconfirmedIndices = [];
      contextAttachMode = "custom";
      contextAttachCustomConfirmed = true;
      contextAttachCustomPending = false;
      contextAttachHasChoice = true;
      if (deps.getMultiSelectMode() && deps.getMultiSelectPurpose() === "contextAttach") {
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
      pendingSendText = "";
      hideModal(contextAttachSendModal);
    }
    function bindContextAttachEvents() {
      bindContextAttachTooltip();
      bindContextAttachPreview();
      const yesBtn = document.getElementById("contextAttachSendYesBtn");
      const noBtn = document.getElementById("contextAttachSendNoBtn");
      if (yesBtn) {
        yesBtn.addEventListener("click", function() {
          const text = pendingSendText;
          if (!text) {
            closeContextAttachSendModal();
            return;
          }
          finalizeContextAttachSelectionFromPending();
          closeContextAttachSendModal();
          deps.executeSendMessage(text, buildContextAttachPayload(false));
        });
      }
      if (noBtn) {
        noBtn.addEventListener("click", function() {
          const text = pendingSendText;
          closeContextAttachSendModal();
          if (text) deps.executeSendMessage(text, { mode: "none" });
        });
      }
      if (contextAttachBtn && contextAttachDropdown) {
        contextAttachBtn.addEventListener("click", function(e) {
          e.stopPropagation();
          const open = contextAttachDropdown.style.display === "none";
          deps.closeAllDropdowns();
          if (open) {
            contextAttachPicker.classList.add("is-open");
            contextAttachDropdown.style.display = "block";
            renderContextAttachOptions();
          }
        });
        contextAttachDropdown.addEventListener("click", function(e) {
          e.stopPropagation();
        });
      }
    }
    function handleExitMultiSelectAttachMode(indices) {
      if (contextAttachCustomPending && !contextAttachCustomConfirmed) {
        if (indices.length > 0) {
          contextAttachUnconfirmedIndices = indices.slice();
          contextAttachMode = "custom";
        } else {
          contextAttachMode = "none";
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
      bindContextAttachEvents
    };
  }

  // media/src/multi-select/index.js
  function createMultiSelect(deps) {
    function isGroupInContextAttachRegion(group) {
      const divider = document.getElementById(LOCAL_HISTORY_DIVIDER_ID);
      if (!divider) {
        return true;
      }
      return !!(group.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING);
    }
    function getSelectableGroups() {
      const purpose = deps.getMultiSelectPurpose();
      return Array.from(messagesEl.querySelectorAll(".message-group.selectable")).filter(function(group) {
        if (group.style.display === "none") {
          return false;
        }
        if (purpose === "contextAttach" && !isGroupInContextAttachRegion(group)) {
          return false;
        }
        if (purpose === "contextAttach" && !deps.isAttachableMemoryGroup(group)) {
          return false;
        }
        return true;
      });
    }
    function getSelectedGroups() {
      return getSelectableGroups().filter(function(group) {
        return group.classList.contains("is-selected");
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
      const isAttachMode = purpose === "contextAttach";
      if (multiSelectCount) {
        multiSelectCount.textContent = count > 0 ? (locale.multiSelectCount || "{0} selected").replace("{0}", String(count)) : locale.selectMessages || "Select";
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
        multiSelectAllBtn.textContent = areAllSelectableGroupsSelected(selectableGroups) ? locale.multiSelectDeselectAll || "\u53D6\u6D88\u5168\u9009" : locale.multiSelectAll || "\u5168\u9009";
      }
      if (isAttachMode) {
        deps.updateContextAttachButtonLabel();
      }
      deps.hideContextAttachPreview();
    }
    function setGroupSelected(group, selected) {
      group.classList.toggle("is-selected", selected);
      const checkbox = getGroupCheckbox(group);
      if (checkbox) checkbox.checked = selected;
      updateMultiSelectToolbar();
    }
    function setGroupsSelected(updates) {
      updates.forEach(function(entry) {
        entry.group.classList.toggle("is-selected", entry.selected);
        const checkbox = getGroupCheckbox(entry.group);
        if (checkbox) checkbox.checked = entry.selected;
      });
      updateMultiSelectToolbar();
    }
    function areAllSelectableGroupsSelected(groups) {
      return groups.length > 0 && groups.every(function(group) {
        return group.classList.contains("is-selected");
      });
    }
    function toggleGroupSelection(group) {
      setGroupSelected(group, !group.classList.contains("is-selected"));
    }
    function enterMultiSelectMode(initialGroup, purpose) {
      deps.setMultiSelectPurpose(purpose || "normal");
      if (deps.getMultiSelectMode()) {
        if (initialGroup) {
          setGroupSelected(initialGroup, true);
        }
        updateMultiSelectToolbar();
        return;
      }
      deps.setMultiSelectMode(true);
      messagesEl.classList.add("multi-select-active");
      if (multiSelectToolbar) {
        multiSelectToolbar.hidden = false;
        multiSelectToolbar.classList.add("visible");
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
      const wasAttachMode = deps.getMultiSelectPurpose() === "contextAttach";
      if (wasAttachMode) {
        deps.handleExitMultiSelectAttachMode(getSelectedMessageIndices());
      }
      deps.setMultiSelectMode(false);
      deps.setMultiSelectPurpose("normal");
      messagesEl.classList.remove("multi-select-active");
      getSelectableGroups().forEach(function(group) {
        setGroupSelected(group, false);
      });
      deps.clearContextAttachSelectableTargets();
      if (multiSelectToolbar) {
        multiSelectToolbar.hidden = true;
        multiSelectToolbar.classList.remove("visible");
      }
      updateMultiSelectToolbar();
      deps.updateContextAttachButtonLabel();
    }
    function wireSelectableGroup(group) {
      if (group.dataset.selectWired) return;
      group.dataset.selectWired = "1";
      group.addEventListener("click", function(e) {
        if (!deps.getMultiSelectMode()) return;
        if (deps.getMultiSelectPurpose() === "contextAttach" && !isGroupInContextAttachRegion(group)) {
          return;
        }
        if (e.target.closest(".message-actions, .block-actions, .insert-dropdown, .insert-dropdown-menu, .msg-select-wrap")) {
          return;
        }
        e.preventDefault();
        toggleGroupSelection(group);
      });
    }
    function getSelectedMessageIndices(groups) {
      return (groups || getSelectedGroups()).map(function(group) {
        return parseInt(group.dataset.sessionIndex || "", 10);
      }).filter(function(index) {
        return Number.isInteger(index) && index >= 0;
      });
    }
    function deleteSelectedGroups() {
      const selected = getSelectedGroups();
      if (!selected.length) return;
      const indices = selected.map(function(group) {
        return parseInt(group.dataset.sessionIndex || "", 10);
      }).filter(function(index) {
        return Number.isInteger(index) && index >= 0;
      });
      vscode.postMessage({ type: "deleteMessages", indices });
      selected.forEach(function(group) {
        group.remove();
      });
      deps.reindexSessionIndices();
      exitMultiSelectMode();
      deps.updateQuickActionBtns();
      if (!messagesEl.querySelector(".message-group")) {
        deps.placeholder.style.display = "block";
      }
    }
    function exportSelectedGroups() {
      const indices = getSelectedMessageIndices();
      if (!indices.length) return;
      deps.requestSessionExport("export", indices);
    }
    function bindMultiSelectEvents() {
      if (multiSelectAllBtn) {
        multiSelectAllBtn.addEventListener("click", function() {
          if (!deps.getMultiSelectMode()) {
            enterMultiSelectMode(null, deps.getMultiSelectPurpose());
          }
          const groups = getSelectableGroups();
          const selectAll = !areAllSelectableGroupsSelected(groups);
          setGroupsSelected(groups.map(function(group) {
            return { group, selected: selectAll };
          }));
        });
      }
      if (multiSelectDeleteBtn) {
        multiSelectDeleteBtn.addEventListener("click", function() {
          if (multiSelectDeleteBtn.disabled) return;
          deleteSelectedGroups();
        });
      }
      if (multiSelectCopyBtn) {
        multiSelectCopyBtn.addEventListener("click", function() {
          if (multiSelectCopyBtn.disabled) return;
          const indices = getSelectedMessageIndices();
          if (!indices.length) return;
          deps.requestSessionExport("copy", indices);
        });
      }
      if (multiSelectExportBtn) {
        multiSelectExportBtn.addEventListener("click", function() {
          if (multiSelectExportBtn.disabled) return;
          exportSelectedGroups();
        });
      }
      const multiSelectExitBtn2 = document.getElementById("multiSelectExitBtn");
      if (multiSelectExitBtn2) {
        multiSelectExitBtn2.addEventListener("click", exitMultiSelectMode);
      }
      if (multiSelectAttachConfirmBtn) {
        multiSelectAttachConfirmBtn.addEventListener("click", function() {
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
      bindMultiSelectEvents
    };
  }

  // media/src/pickers/index.js
  function createPickers(deps) {
    const profilePicker = document.getElementById("profilePicker");
    const profileBtn = document.getElementById("profileBtn");
    const profileDropdown = document.getElementById("profileDropdown");
    const modelPicker = document.getElementById("modelPicker");
    const modelBtn = document.getElementById("modelBtn");
    const modelLabelEl = document.getElementById("modelLabel");
    const modelDropdown = document.getElementById("modelDropdown");
    let modelConfigId = "";
    let lastModelPayload = null;
    function closeAllDropdowns() {
      profilePicker.classList.remove("is-open");
      modelPicker.classList.remove("is-open");
      if (contextAttachPicker) contextAttachPicker.classList.remove("is-open");
      profileDropdown.style.display = "none";
      modelDropdown.style.display = "none";
      if (contextAttachDropdown) contextAttachDropdown.style.display = "none";
      deps.hideContextAttachTooltip();
      deps.hideContextAttachPreview();
    }
    function renderProfileList(profiles) {
      const locale = deps.getLocale();
      const list = document.getElementById("profileList");
      const current = document.getElementById("profileLabel").textContent;
      const entries = (profiles || []).map(function(item) {
        if (item && typeof item === "object" && item.id) {
          return { id: String(item.id), label: String(item.label || item.id) };
        }
        const name = String(item || "");
        return { id: name, label: name };
      });
      if (!entries.length) {
        list.innerHTML = '<div class="dropdown-item disabled">' + escapeHtml2(locale.configureAgents) + "</div>";
        return;
      }
      list.innerHTML = entries.map(function(entry) {
        const active = entry.label === current ? " active" : "";
        return '<div class="dropdown-item' + active + '" data-profile="' + escapeHtml2(entry.id) + '">' + escapeHtml2(entry.label) + (active ? " \u2713" : "") + "</div>";
      }).join("");
      list.querySelectorAll(".dropdown-item[data-profile]").forEach(function(item) {
        item.addEventListener("click", function() {
          vscode.postMessage({ type: "switchAgent", agentName: this.dataset.profile });
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
        modelLabelEl.textContent = locale.modelPlaceholder || "";
        modelBtn.classList.add("is-placeholder");
        modelBtn.title = locale.modelPlaceholder || locale.switchModel || "";
        return;
      }
      modelLabelEl.textContent = payload.currentLabel || payload.currentValueId || "";
      modelBtn.classList.remove("is-placeholder");
      modelBtn.title = payload.fromAgent ? locale.modelFromAgent : locale.modelLocalPreference;
    }
    function renderModelList(payload) {
      const locale = deps.getLocale();
      const list = document.getElementById("modelList");
      lastModelPayload = payload;
      modelConfigId = payload.configId || "";
      updateModelButtonDisplay(payload);
      const groups = Array.isArray(payload.groups) ? payload.groups.filter(function(g) {
        return g && Array.isArray(g.models) && g.models.length > 0;
      }) : [];
      const models = payload.models || [];
      if (!models.length) {
        list.innerHTML = '<div class="dropdown-item disabled">' + escapeHtml2(locale.noModels) + "</div>";
        return;
      }
      if (groups.length > 1) {
        list.innerHTML = groups.map(function(group) {
          const header = '<div class="dropdown-group-label">' + escapeHtml2(group.name || group.slug || "") + "</div>";
          const items = group.models.map(function(m) {
            const active = m.valueId === payload.currentValueId;
            return '<div class="dropdown-item' + (active ? " active" : "") + '" data-value="' + escapeHtml2(m.valueId) + '">' + escapeHtml2(m.name) + (active ? " \u2713" : "") + "</div>";
          }).join("");
          return header + items;
        }).join("");
      } else {
        list.innerHTML = models.map(function(m) {
          const active = m.valueId === payload.currentValueId;
          return '<div class="dropdown-item' + (active ? " active" : "") + '" data-value="' + escapeHtml2(m.valueId) + '">' + escapeHtml2(m.name) + (active ? " \u2713" : "") + "</div>";
        }).join("");
      }
      list.querySelectorAll(".dropdown-item[data-value]").forEach(function(item) {
        item.addEventListener("click", function() {
          vscode.postMessage({
            type: "switchModel",
            configId: modelConfigId,
            valueId: this.dataset.value
          });
          closeAllDropdowns();
        });
      });
    }
    function bindPickerEvents() {
      document.addEventListener("click", function(e) {
        if (e.target.closest(".picker")) {
          return;
        }
        if (e.target.closest("#contextAttachPreview")) {
          return;
        }
        if (!e.target.closest("#input-area")) {
          deps.hideFilePicker();
        }
        closeAllDropdowns();
      });
      profileBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        const open = profileDropdown.style.display === "none";
        closeAllDropdowns();
        if (open) {
          profilePicker.classList.add("is-open");
          profileDropdown.style.display = "block";
          vscode.postMessage({ type: "getProfiles" });
        }
      });
      profileDropdown.addEventListener("click", function(e) {
        e.stopPropagation();
      });
      modelBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        const open = modelDropdown.style.display === "none";
        closeAllDropdowns();
        if (open) {
          modelPicker.classList.add("is-open");
          modelDropdown.style.display = "block";
          vscode.postMessage({ type: "getModels" });
        }
      });
      modelDropdown.addEventListener("click", function(e) {
        e.stopPropagation();
      });
    }
    function refreshModelButtonDisplay() {
      updateModelButtonDisplay(lastModelPayload);
    }
    return {
      closeAllDropdowns,
      renderProfileList,
      renderModelList,
      refreshModelButtonDisplay,
      bindPickerEvents
    };
  }

  // media/src/input/quick-actions.js
  function createQuickActions(deps) {
    function updateQuickActionBtns() {
      const hasMessages = messagesEl.querySelectorAll(".message-group").length > 0;
      const hasInput = !!inputEl.value.trim();
      if (clearChatBtn) clearChatBtn.disabled = !hasMessages;
      if (copySessionBtn) copySessionBtn.disabled = !hasMessages;
      if (clearInputBtn) clearInputBtn.disabled = !hasInput;
      if (chatSearchInput) chatSearchInput.disabled = !hasMessages;
      if (!hasMessages) deps.clearChatSearch();
      else if (chatSearchInput && chatSearchInput.value.trim()) deps.scheduleChatSearch();
    }
    function flashQuickActionBtn(btn, className, duration) {
      if (!btn) return;
      btn.classList.add(className || "copied");
      setTimeout(function() {
        btn.classList.remove(className || "copied");
      }, duration || 1500);
    }
    function setQuickPanelOpen(open) {
      const locale = deps.getLocale();
      if (!inputQuickPanel || !quickToggleBtn) return;
      inputQuickPanel.classList.toggle("open", open);
      inputQuickPanel.setAttribute("aria-hidden", open ? "false" : "true");
      quickToggleBtn.setAttribute("aria-expanded", open ? "true" : "false");
      quickToggleBtn.title = open ? locale.quickActionsCollapse : locale.quickActionsExpand;
      if (open && chatSearchInput && !chatSearchInput.disabled) {
        setTimeout(function() {
          chatSearchInput.focus();
        }, 280);
      }
    }
    function toggleQuickPanel() {
      setQuickPanelOpen(!inputQuickPanel.classList.contains("open"));
    }
    function appendToInput(text) {
      if (!text) return;
      deps.hideFilePicker();
      const val = inputEl.value;
      const needsSep = val.length > 0 && !/\n$/.test(val);
      inputEl.value = val + (needsSep ? "\n" : "") + text;
      if (!inputEl.disabled) {
        const pos = inputEl.value.length;
        inputEl.setSelectionRange(pos, pos);
        deps.syncInputHeightFromContent();
        updateQuickActionBtns();
        inputEl.focus();
      }
    }
    function insertIntoInput(text) {
      if (!text) return;
      deps.hideFilePicker();
      const val = inputEl.value;
      const start = typeof inputEl.selectionStart === "number" ? inputEl.selectionStart : val.length;
      const end = typeof inputEl.selectionEnd === "number" ? inputEl.selectionEnd : start;
      inputEl.value = val.slice(0, start) + text + val.slice(end);
      if (!inputEl.disabled) {
        const pos = start + text.length;
        inputEl.setSelectionRange(pos, pos);
        deps.syncInputHeightFromContent();
        updateQuickActionBtns();
        inputEl.focus();
      }
    }
    function insertToEditor(text) {
      if (!text) return;
      vscode.postMessage({ type: "insertEditor", text });
    }
    function bindQuickActionEvents() {
      if (quickToggleBtn) {
        quickToggleBtn.addEventListener("click", toggleQuickPanel);
      }
      if (clearChatBtn) {
        clearChatBtn.addEventListener("click", function() {
          if (clearChatBtn.disabled) return;
          vscode.postMessage({ type: "clearChat" });
        });
      }
    }
    return {
      updateQuickActionBtns,
      flashQuickActionBtn,
      appendToInput,
      insertIntoInput,
      insertToEditor,
      bindQuickActionEvents
    };
  }

  // media/src/app/bootstrap/create-message-graph.js
  function createMessageGraph(ctx) {
    const session2 = ctx.session;
    let quickActions;
    let messages;
    let contextAttach;
    let auxiliary;
    let chatSearch;
    let pickers;
    let multiSelect;
    let send;
    let sessionRender;
    const fileRefs = createFileRefs({
      filePickerEl,
      getLocale: ctx.getLocale,
      syncInputHeightFromContent,
      updateQuickActionBtns: () => quickActions.updateQuickActionBtns()
    });
    fileRefs.bindFilePickerInputHandlers();
    multiSelect = createMultiSelect({
      getLocale: ctx.getLocale,
      getMultiSelectMode: session2.getMultiSelectMode,
      setMultiSelectMode: session2.setMultiSelectMode,
      getMultiSelectPurpose: session2.getMultiSelectPurpose,
      setMultiSelectPurpose: session2.setMultiSelectPurpose,
      isAttachableMemoryGroup: (g) => contextAttach.isAttachableMemoryGroup(g),
      hideContextAttachPreview: () => contextAttach.hideContextAttachPreview(),
      updateContextAttachButtonLabel: () => contextAttach.updateContextAttachButtonLabel(),
      clearContextAttachSelectableTargets: () => contextAttach.clearContextAttachSelectableTargets(),
      handleExitMultiSelectAttachMode: (indices) => contextAttach.handleExitMultiSelectAttachMode(indices),
      confirmContextAttachSelection: () => contextAttach.confirmContextAttachSelection(),
      reindexSessionIndices: ctx.reindexSessionIndices,
      updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),
      placeholder: ctx.getPlaceholder(),
      requestSessionExport: ctx.requestSessionExport
    });
    messages = createAddMessage({
      getLocale: ctx.getLocale,
      placeholder: ctx.getPlaceholder(),
      getStreamingMessageId: session2.getStreamingMessageId,
      setStreamingMessageId: session2.setStreamingMessageId,
      getThoughtMsgId: session2.getThoughtMsgId,
      setThoughtMsgId: session2.setThoughtMsgId,
      chatSearchHasQuery: () => chatSearch.hasQuery(),
      scheduleChatSearch: () => chatSearch.scheduleChatSearch(),
      maybeScrollToBottom,
      isSelectableRole,
      setGroupSelected: (...a) => multiSelect.setGroupSelected(...a),
      wireSelectableGroup: (...a) => multiSelect.wireSelectableGroup(...a),
      assignSessionIndex: ctx.assignSessionIndex,
      buildAuxiliaryMessage: (...a) => auxiliary.buildAuxiliaryMessage(...a),
      wireAuxiliaryMessage: (...a) => auxiliary.wireAuxiliaryMessage(...a),
      resetToolAggregation: () => auxiliary.resetToolAggregation(),
      clearAllToolLive: () => auxiliary.clearAllToolLive(),
      enableStopAfterAgentOutput: () => messages.enableStopAfterAgentOutput(),
      processFileRefs: (...a) => fileRefs.processFileRefs(...a),
      setupContentBlocks: (...a) => ctx.setupContentBlocks(...a),
      setAuxMessageLive: (...a) => auxiliary.setAuxMessageLive(...a),
      finalizeAuxiliaryBubble: (...a) => auxiliary.finalizeAuxiliaryBubble(...a),
      enterMultiSelectMode: (...a) => multiSelect.enterMultiSelectMode(...a),
      updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),
      getAwaitingFirstChunk: session2.getAwaitingFirstChunk,
      setAwaitingFirstChunk: session2.setAwaitingFirstChunk,
      getIsPrompting: session2.getIsPrompting,
      getCanSend: session2.getCanSend,
      setInputMode: ctx.setInputMode
    });
    send = createSend({
      hideFilePicker: () => fileRefs.hideFilePicker(),
      addMessage: (...a) => messages.addMessage(...a),
      syncInputHeightFromContent,
      updateQuickActionBtns: () => quickActions.updateQuickActionBtns(),
      setAwaitingFirstChunk: session2.setAwaitingFirstChunk,
      setInputMode: ctx.setInputMode,
      buildContextAttachPayload: (...a) => contextAttach.buildContextAttachPayload(...a),
      hasUnconfirmedCustomMemorySelection: () => contextAttach.hasUnconfirmedCustomMemorySelection(),
      openContextAttachSendModal: (...a) => contextAttach.openContextAttachSendModal(...a),
      getCanSend: session2.getCanSend,
      getMultiSelectMode: session2.getMultiSelectMode,
      exitMultiSelectMode: () => multiSelect.exitMultiSelectMode()
    });
    send.bindSendEvents();
    contextAttach = createContextAttach({
      getLocale: ctx.getLocale,
      getMessagePlainText: (...a) => messages.getMessagePlainText(...a),
      getMultiSelectPurpose: session2.getMultiSelectPurpose,
      getMultiSelectMode: session2.getMultiSelectMode,
      exitMultiSelectMode: () => multiSelect.exitMultiSelectMode(),
      enterMultiSelectMode: (...a) => multiSelect.enterMultiSelectMode(...a),
      getSelectedMessageIndices: (...a) => multiSelect.getSelectedMessageIndices(...a),
      setGroupSelected: (...a) => multiSelect.setGroupSelected(...a),
      setGroupsSelected: (...a) => multiSelect.setGroupsSelected(...a),
      wireSelectableGroup: (...a) => multiSelect.wireSelectableGroup(...a),
      closeAllDropdowns: () => pickers.closeAllDropdowns(),
      executeSendMessage: (...a) => send.executeSendMessage(...a)
    });
    contextAttach.bindContextAttachEvents();
    pickers = createPickers({
      getLocale: ctx.getLocale,
      hideFilePicker: () => fileRefs.hideFilePicker(),
      hideContextAttachTooltip: () => contextAttach.hideContextAttachTooltip(),
      hideContextAttachPreview: () => contextAttach.hideContextAttachPreview()
    });
    pickers.bindPickerEvents();
    multiSelect.bindMultiSelectEvents();
    sessionRender = createSessionRender({
      getLocale: ctx.getLocale,
      setupContentBlocks: (...a) => ctx.setupContentBlocks(...a),
      processFileRefs: (...a) => fileRefs.processFileRefs(...a),
      setAuxiliaryContent: (...a) => auxiliary.setAuxiliaryContent(...a),
      chatSearchHasQuery: () => chatSearch.hasQuery(),
      scheduleChatSearch: () => chatSearch.scheduleChatSearch()
    });
    const {
      getMessagePlainText,
      addMessage,
      finalizeAssistantBubble,
      enableStopAfterAgentOutput,
      finishStreaming
    } = messages;
    auxiliary = createAuxiliaryMessages({
      getLocale: ctx.getLocale,
      setupContentBlocks: (...args) => ctx.setupContentBlocks(...args),
      processFileRefs: (...a) => fileRefs.processFileRefs(...a),
      maybeScrollToBottom,
      get addMessage() {
        return addMessage;
      },
      get finalizeAssistantBubble() {
        return finalizeAssistantBubble;
      },
      enableStopAfterAgentOutput
    });
    chatSearch = createChatSearch({ getMessagePlainText });
    chatSearch.bindChatSearchEvents();
    quickActions = createQuickActions({
      getLocale: ctx.getLocale,
      hideFilePicker: () => fileRefs.hideFilePicker(),
      syncInputHeightFromContent,
      clearChatSearch: () => chatSearch.clearChatSearch(),
      scheduleChatSearch: () => chatSearch.scheduleChatSearch()
    });
    quickActions.bindQuickActionEvents();
    return {
      fileRefs,
      multiSelect,
      messages,
      send,
      contextAttach,
      pickers,
      sessionRender,
      auxiliary,
      chatSearch,
      quickActions,
      getMessagePlainText,
      addMessage,
      finalizeAssistantBubble,
      enableStopAfterAgentOutput,
      finishStreaming
    };
  }

  // media/src/messages/content-blocks.js
  function createContentBlocks(deps) {
    function closeInsertDropdowns(except) {
      document.querySelectorAll(".insert-dropdown.is-open").forEach(function(dropdown) {
        if (except && dropdown === except) return;
        dropdown.classList.remove("is-open");
      });
    }
    function createInsertDropdown(getText) {
      const locale = deps.getLocale();
      const dropdown = document.createElement("div");
      dropdown.className = "insert-dropdown";
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "block-btn insert-toggle";
      toggle.innerHTML = escapeHtml2(locale.insertMenu || locale.insert) + CHEVRON_DOWN_SVG;
      toggle.addEventListener("click", function(e) {
        e.stopPropagation();
        const open = dropdown.classList.contains("is-open");
        closeInsertDropdowns();
        dropdown.classList.toggle("is-open", !open);
      });
      const menu = document.createElement("div");
      menu.className = "insert-dropdown-menu";
      const inputBtn = document.createElement("button");
      inputBtn.type = "button";
      inputBtn.textContent = locale.insertToInput;
      inputBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        closeInsertDropdowns();
        if (inputEl.disabled) return;
        deps.appendToInput(getText());
      });
      const editorBtn = document.createElement("button");
      editorBtn.type = "button";
      editorBtn.textContent = locale.insertToEditor;
      editorBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        closeInsertDropdowns();
        deps.insertToEditor(getText());
      });
      menu.appendChild(inputBtn);
      menu.appendChild(editorBtn);
      dropdown.appendChild(toggle);
      dropdown.appendChild(menu);
      return dropdown;
    }
    function addBlockActions(container, getText) {
      const locale = deps.getLocale();
      if (container.querySelector(".block-actions")) return;
      const actions = document.createElement("div");
      actions.className = "block-actions";
      const copyBtn = document.createElement("button");
      copyBtn.type = "button";
      copyBtn.className = "block-btn";
      copyBtn.title = locale.copy;
      copyBtn.innerHTML = COPY_ICON_SVG;
      copyBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        copyToClipboard(getText()).then(function() {
          copyBtn.classList.add("copied");
          copyBtn.title = locale.copied;
          setTimeout(function() {
            copyBtn.classList.remove("copied");
            copyBtn.title = locale.copy;
          }, 1500);
        });
      });
      actions.appendChild(copyBtn);
      actions.appendChild(createInsertDropdown(getText));
      container.appendChild(actions);
    }
    function tableToMarkdown(table) {
      const rows = [];
      table.querySelectorAll("tr").forEach(function(tr) {
        const cells = [];
        tr.querySelectorAll("th, td").forEach(function(cell) {
          cells.push((cell.textContent || "").replace(/\|/g, "\\|").replace(/\n/g, " ").trim());
        });
        if (cells.length) rows.push(cells);
      });
      if (!rows.length) return "";
      const widths = rows[0].map(function(_, index) {
        return Math.max.apply(null, rows.map(function(row) {
          return (row[index] || "").length;
        }));
      });
      const formatRow = function(row) {
        return "| " + row.map(function(cell, index) {
          return (cell || "").padEnd(widths[index], " ");
        }).join(" | ") + " |";
      };
      const header = formatRow(rows[0]);
      const divider = "| " + widths.map(function(width) {
        return "-".repeat(Math.max(3, width));
      }).join(" | ") + " |";
      const body = rows.slice(1).map(formatRow);
      return [header, divider].concat(body).join("\n");
    }
    function setupTableBlock(table) {
      if (!table || table.dataset.blockReady) return;
      table.dataset.blockReady = "1";
      const wrap = document.createElement("div");
      wrap.className = "block-actions-wrap";
      table.parentNode.insertBefore(wrap, table);
      wrap.appendChild(table);
      addBlockActions(wrap, function() {
        return tableToMarkdown(table);
      });
    }
    function setupCodeBlock(codeBlock) {
      const pre = codeBlock.closest("pre");
      if (!pre || pre.dataset.blockReady) return;
      pre.dataset.blockReady = "1";
      hljs.highlightElement(codeBlock);
      const lang = (codeBlock.className.match(/language-(\w+)/) || [])[1] || "";
      const wrap = document.createElement("div");
      wrap.className = "block-actions-wrap";
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);
      addBlockActions(wrap, function() {
        const code = codeBlock.textContent || "";
        if (!lang) return code;
        return "```" + lang + "\n" + code + "\n```";
      });
    }
    function setupContentBlocks(container) {
      if (!container) return;
      container.querySelectorAll("pre code").forEach(function(block) {
        setupCodeBlock(block);
      });
      container.querySelectorAll("table").forEach(function(table) {
        setupTableBlock(table);
      });
    }
    return { setupContentBlocks, closeInsertDropdowns };
  }

  // media/src/messages/permissions.js
  var PERM_COLLAPSED_LINES = 3;
  var PERM_LINE_HEIGHT_EM = 1.45;
  function createPermissions(deps) {
    const pendingPermissions = /* @__PURE__ */ new Map();
    function permissionBodyText(title, detail) {
      const parts = [];
      if (title) parts.push(String(title));
      if (detail && String(detail).trim()) parts.push(String(detail).trim());
      return parts.join("\n\n");
    }
    function permissionOptionLabel(opt) {
      const locale = deps.getLocale();
      const kind = String(opt.kind || "").toLowerCase().replace(/-/g, "_");
      const id = String(opt.optionId || "").toLowerCase().replace(/-/g, "_");
      const map = {
        allow_once: "permissionAllowOnce",
        allow_always: "permissionAllowAlways",
        allow_session: "permissionAllowSession",
        reject_once: "permissionRejectOnce",
        reject_always: "permissionRejectAlways",
        deny_once: "permissionRejectOnce",
        deny_always: "permissionRejectAlways",
        deny: "permissionDeny"
      };
      let key = map[id] || map[kind];
      const tokens = [id, kind].filter(Boolean);
      if (!key) {
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i].indexOf("allow") >= 0 && tokens[i].indexOf("session") >= 0) {
            key = "permissionAllowSession";
            break;
          }
        }
      }
      if (!key) {
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i].indexOf("allow") >= 0 && tokens[i].indexOf("always") >= 0) {
            key = "permissionAllowAlways";
            break;
          }
        }
      }
      if (!key) {
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i].indexOf("allow") >= 0) {
            key = "permissionAllowOnce";
            break;
          }
        }
      }
      if (!key) {
        for (let i = 0; i < tokens.length; i++) {
          if ((tokens[i].indexOf("reject") >= 0 || tokens[i].indexOf("deny") >= 0) && tokens[i].indexOf("always") >= 0) {
            key = "permissionRejectAlways";
            break;
          }
        }
      }
      if (!key) {
        for (let i = 0; i < tokens.length; i++) {
          if (tokens[i].indexOf("reject") >= 0 || tokens[i].indexOf("deny") >= 0) {
            key = tokens[i].indexOf("once") >= 0 ? "permissionRejectOnce" : "permissionDeny";
            break;
          }
        }
      }
      if (key && locale[key]) return locale[key];
      return opt.name || opt.optionId;
    }
    function getPermissionCollapsedMaxHeight() {
      return PERM_LINE_HEIGHT_EM * PERM_COLLAPSED_LINES + "em";
    }
    function permissionDetailOverflows(scrollEl, text) {
      if (!scrollEl) return false;
      if (text && text.split("\n").length > PERM_COLLAPSED_LINES) return true;
      return scrollEl.scrollHeight > scrollEl.clientHeight + 1;
    }
    function syncPermissionDetailView(group) {
      const locale = deps.getLocale();
      const state = group._permissionState;
      if (!state || !state.scrollEl) return;
      state.textEl.textContent = state.text || "";
      state.wrapEl.style.display = state.cardCollapsed ? "none" : "";
      state.scrollEl.classList.toggle("is-collapsed", !state.detailExpanded);
      state.scrollEl.classList.toggle("is-expanded", state.detailExpanded);
      if (!state.detailExpanded) {
        state.scrollEl.style.maxHeight = getPermissionCollapsedMaxHeight();
        state.scrollEl.scrollTop = state.scrollEl.scrollHeight;
      } else {
        state.scrollEl.style.maxHeight = "";
      }
      const overflow = permissionDetailOverflows(state.scrollEl, state.text);
      state.moreBtn.hidden = state.detailExpanded || !overflow;
      state.lessBtn.hidden = !state.detailExpanded || !overflow;
      state.cardToggle.title = state.cardCollapsed ? locale.permissionCardExpand || "Expand details" : locale.permissionCardCollapse || "Collapse details";
      state.cardToggle.setAttribute("aria-expanded", state.cardCollapsed ? "false" : "true");
    }
    function updatePermissionContent(group, title, detail) {
      if (!group._permissionState) return;
      group._permissionState.text = permissionBodyText(title, detail);
      syncPermissionDetailView(group);
    }
    function refreshPermissionOptionLabels(group) {
      if (!group._permissionState) return;
      group._permissionState.options.forEach(function(opt) {
        const btn = group.querySelector('.permission-btn[data-option-id="' + opt.optionId.replace(/"/g, '\\"') + '"]');
        if (btn) btn.textContent = permissionOptionLabel(opt);
      });
    }
    function resolvePermission(id, optionId, selectedLabel) {
      const group = pendingPermissions.get(id);
      if (!group) {
        return;
      }
      pendingPermissions.delete(id);
      applyPermissionResolvedUI(group, deps.localeText("permissionSelected", selectedLabel || optionId));
      vscode.postMessage({ type: "permissionResponse", id, optionId });
    }
    function buildPermissionActions(id, options, readOnly) {
      const actions = document.createElement("div");
      actions.className = "permission-actions";
      if (readOnly) {
        actions.style.display = "none";
        return actions;
      }
      (options || []).forEach(function(opt) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "permission-btn";
        btn.dataset.optionId = opt.optionId;
        const kind = String(opt.kind || "").toLowerCase();
        const idLower = String(opt.optionId || "").toLowerCase();
        if (kind.indexOf("allow") === 0 || idLower.indexOf("allow") === 0) {
          btn.classList.add("allow");
        } else if (kind.indexOf("reject") === 0 || kind.indexOf("deny") === 0 || idLower.indexOf("reject") >= 0 || idLower.indexOf("deny") >= 0) {
          btn.classList.add("reject");
        }
        btn.textContent = permissionOptionLabel(opt);
        btn.addEventListener("click", function() {
          resolvePermission(id, opt.optionId, permissionOptionLabel(opt));
        });
        actions.appendChild(btn);
      });
      return actions;
    }
    function applyPermissionResolvedUI(group, statusText2) {
      const div = group.querySelector(".message");
      if (!div) {
        return;
      }
      div.classList.remove("pending");
      div.classList.add("resolved");
      group.querySelectorAll(".permission-btn").forEach(function(btn) {
        btn.disabled = true;
      });
      const actions = group.querySelector(".permission-actions");
      if (actions) {
        actions.style.display = "none";
      }
      let status = div.querySelector(".permission-status");
      if (!status) {
        status = document.createElement("div");
        status.className = "permission-status";
        div.appendChild(status);
      }
      status.textContent = statusText2;
    }
    function createPermissionCard(id, msg, cardOptions) {
      const locale = deps.getLocale();
      const readOnly = !!(cardOptions && cardOptions.readOnly);
      const group = document.createElement("div");
      group.className = "message-group permission";
      group.id = "perm-" + id;
      group.dataset.permissionId = id;
      const div = document.createElement("div");
      div.className = "message permission" + (readOnly || msg.resolved ? " resolved" : " pending");
      const header = document.createElement("div");
      header.className = "permission-header";
      const label = document.createElement("div");
      label.className = "label permission-label";
      label.textContent = locale.permissionTitle || "Permission required";
      header.appendChild(label);
      const cardToggle = document.createElement("button");
      cardToggle.type = "button";
      cardToggle.className = "permission-card-toggle";
      cardToggle.innerHTML = '<span class="permission-card-arrow">\u25BC</span>';
      header.appendChild(cardToggle);
      div.appendChild(header);
      const wrap = document.createElement("div");
      wrap.className = "permission-detail-wrap";
      const scrollEl = document.createElement("div");
      scrollEl.className = "permission-detail-scroll is-collapsed";
      const textEl = document.createElement("div");
      textEl.className = "permission-detail-text";
      scrollEl.appendChild(textEl);
      wrap.appendChild(scrollEl);
      const controls = document.createElement("div");
      controls.className = "permission-detail-controls";
      const moreBtn = document.createElement("button");
      moreBtn.type = "button";
      moreBtn.className = "permission-detail-toggle";
      moreBtn.textContent = locale.permissionShowMore || "Show more";
      const lessBtn = document.createElement("button");
      lessBtn.type = "button";
      lessBtn.className = "permission-detail-toggle";
      lessBtn.textContent = locale.permissionCollapse || "Collapse";
      lessBtn.hidden = true;
      controls.appendChild(moreBtn);
      controls.appendChild(lessBtn);
      wrap.appendChild(controls);
      div.appendChild(wrap);
      const options = msg.options || [];
      div.appendChild(buildPermissionActions(id, options, readOnly));
      group.appendChild(div);
      group._permissionState = {
        text: permissionBodyText(msg.title, msg.detail),
        detailExpanded: !!(readOnly || msg.resolved),
        cardCollapsed: false,
        options,
        wrapEl: wrap,
        scrollEl,
        textEl,
        moreBtn,
        lessBtn,
        cardToggle,
        readOnly
      };
      cardToggle.addEventListener("click", function(e) {
        e.stopPropagation();
        group._permissionState.cardCollapsed = !group._permissionState.cardCollapsed;
        div.classList.toggle("is-card-collapsed", group._permissionState.cardCollapsed);
        syncPermissionDetailView(group);
      });
      moreBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        group._permissionState.detailExpanded = true;
        syncPermissionDetailView(group);
      });
      lessBtn.addEventListener("click", function(e) {
        e.stopPropagation();
        group._permissionState.detailExpanded = false;
        syncPermissionDetailView(group);
      });
      updatePermissionContent(group, msg.title, msg.detail);
      if (readOnly || msg.resolved) {
        let statusText2 = locale.permissionCancelled || "Cancelled";
        if (msg.outcome === "selected" && (msg.selectedLabel || msg.selectedOptionId)) {
          statusText2 = deps.localeText("permissionSelected", msg.selectedLabel || msg.selectedOptionId);
        } else if (msg.selectedLabel) {
          statusText2 = deps.localeText("permissionSelected", msg.selectedLabel);
        }
        applyPermissionResolvedUI(group, statusText2);
      }
      deps.assignSessionIndex(group);
      return group;
    }
    function restorePermissionMessage(m) {
      const id = m.permissionId || "perm_hist_" + (m.timestamp || Date.now());
      const group = createPermissionCard(id, {
        title: m.title || m.text || "",
        detail: m.detail || "",
        options: m.options || [],
        resolved: true,
        outcome: m.outcome,
        selectedLabel: m.selectedLabel,
        selectedOptionId: m.selectedOptionId
      }, { readOnly: true });
      messagesEl.appendChild(group);
    }
    function showPermissionRequest(msg) {
      deps.finalizeAssistantBubble();
      deps.placeholder.style.display = "none";
      deps.enableStopAfterAgentOutput();
      const id = msg.id;
      if (!id) {
        return;
      }
      if (pendingPermissions.has(id)) {
        updatePermissionContent(pendingPermissions.get(id), msg.title, msg.detail);
        return;
      }
      const group = createPermissionCard(id, msg);
      messagesEl.appendChild(group);
      pendingPermissions.set(id, group);
      deps.maybeScrollToBottom();
    }
    function dismissPermissionRequest(id, statusText2) {
      const locale = deps.getLocale();
      const group = pendingPermissions.get(id);
      if (!group) {
        return;
      }
      pendingPermissions.delete(id);
      applyPermissionResolvedUI(group, statusText2 || locale.permissionCancelled || "Cancelled");
    }
    function clearPendingPermissions() {
      pendingPermissions.clear();
    }
    function refreshAllPermissionLocale() {
      const locale = deps.getLocale();
      pendingPermissions.forEach(function(group) {
        const labelEl = group.querySelector(".permission-label");
        if (labelEl) labelEl.textContent = locale.permissionTitle || "Permission required";
        refreshPermissionOptionLabels(group);
        if (group._permissionState) {
          group._permissionState.moreBtn.textContent = locale.permissionShowMore || "Show more";
          group._permissionState.lessBtn.textContent = locale.permissionCollapse || "Collapse";
          syncPermissionDetailView(group);
        }
      });
    }
    return {
      pendingPermissions,
      createPermissionCard,
      restorePermissionMessage,
      updatePermissionContent,
      refreshPermissionOptionLabels,
      showPermissionRequest,
      dismissPermissionRequest,
      clearPendingPermissions,
      refreshAllPermissionLocale
    };
  }

  // media/src/sessions/tabs.js
  function createSessionTabs(deps) {
    let editingSessionId = null;
    let tabContextSessionId = null;
    function startTabRename(tab, sessionId) {
      const locale = deps.getLocale();
      if (!tab || tab.classList.contains("editing")) {
        return;
      }
      tab.classList.add("editing");
      tab.draggable = false;
      editingSessionId = sessionId;
      const titleEl = tab.querySelector(".tab-title");
      if (!titleEl) {
        return;
      }
      const previousTitle = titleEl.textContent || locale.newChat;
      const input = document.createElement("input");
      input.type = "text";
      input.className = "tab-title-input";
      input.value = previousTitle;
      input.maxLength = 80;
      titleEl.replaceWith(input);
      input.focus();
      input.select();
      let finished = false;
      function finish(commit) {
        if (finished) {
          return;
        }
        finished = true;
        editingSessionId = null;
        tab.classList.remove("editing");
        const newTitle = input.value.trim() || locale.newChat;
        const span = document.createElement("span");
        span.className = "tab-title";
        span.textContent = commit ? newTitle : previousTitle;
        input.replaceWith(span);
        tab.draggable = true;
        if (commit) {
          vscode.postMessage({ type: "renameSession", sessionId, title: newTitle });
        }
      }
      input.addEventListener("keydown", function(e) {
        e.stopPropagation();
        if (e.key === "Enter") {
          e.preventDefault();
          finish(true);
        } else if (e.key === "Escape") {
          e.preventDefault();
          finish(false);
        }
      });
      input.addEventListener("blur", function() {
        finish(true);
      });
      input.addEventListener("click", function(e) {
        e.stopPropagation();
      });
    }
    function renderSessionTabs(sessions, activeId) {
      const locale = deps.getLocale();
      deps.setActiveSessionId(activeId || deps.getActiveSessionId());
      deps.setLastSessions(sessions || []);
      deps.setLastActiveSessionId(deps.getActiveSessionId());
      if (editingSessionId) {
        return;
      }
      if (!sessions || sessions.length === 0) {
        tabBar.innerHTML = "";
        return;
      }
      const activeSessionId = deps.getActiveSessionId();
      const parts = [];
      sessions.forEach(function(s, index) {
        const active = s.id === activeSessionId ? " active" : "";
        const pinnedClass = s.pinned ? " pinned" : "";
        const title = escapeHtml2(s.title || locale.newChat);
        const pinIcon = s.pinned ? '<span class="tab-pin-icon" title="' + escapeHtml2(locale.tabContextPin) + '">' + TAB_PIN_SVG + "</span>" : "";
        parts.push('<div class="session-tab' + active + pinnedClass + '" data-id="' + escapeHtml2(s.id) + '" title="' + title + '">' + pinIcon + '<span class="tab-title">' + title + '</span><span class="tab-close" data-id="' + escapeHtml2(s.id) + '" title="' + escapeHtml2(locale.tabClose) + '">\xD7</span></div>');
        if (s.pinned && index < sessions.length - 1 && !sessions[index + 1].pinned) {
          parts.push('<span class="tab-pin-separator" aria-hidden="true"></span>');
        }
      });
      tabBar.innerHTML = parts.join("");
      tabBar.querySelectorAll(".session-tab").forEach(function(tab) {
        tab.addEventListener("click", function(e) {
          if (e.target && e.target.closest && e.target.closest(".tab-close")) {
            return;
          }
          if (tab.classList.contains("editing")) {
            return;
          }
          if (tab.dataset.id !== deps.getActiveSessionId()) {
            deps.requestSwitchSession(tab.dataset.id);
          }
        });
        tab.addEventListener("dblclick", function(e) {
          if (e.target && e.target.closest && e.target.closest(".tab-close")) {
            return;
          }
          e.preventDefault();
          e.stopPropagation();
          startTabRename(tab, tab.dataset.id);
        });
        tab.addEventListener("contextmenu", function(e) {
          e.preventDefault();
          e.stopPropagation();
          showTabContextMenu(tab.dataset.id, e.clientX, e.clientY);
        });
        wireTabDragDrop(tab);
      });
      tabBar.querySelectorAll(".tab-close").forEach(function(btn) {
        btn.addEventListener("click", function(e) {
          e.preventDefault();
          e.stopPropagation();
          vscode.postMessage({ type: "deleteSession", sessionId: btn.dataset.id });
        });
      });
      const activeTab = tabBar.querySelector(".session-tab.active");
      if (activeTab) {
        activeTab.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }
    function reorderSessionTabs(fromId, toId) {
      const lastSessions = deps.getLastSessions();
      if (!fromId || !toId || fromId === toId || !lastSessions.length) {
        return;
      }
      const fromSession = lastSessions.find(function(s) {
        return s.id === fromId;
      });
      const toSession = lastSessions.find(function(s) {
        return s.id === toId;
      });
      if (!fromSession || !toSession) {
        return;
      }
      if (!!fromSession.pinned !== !!toSession.pinned) {
        return;
      }
      const ids = lastSessions.map(function(s) {
        return s.id;
      });
      const fromIdx = ids.indexOf(fromId);
      const toIdx = ids.indexOf(toId);
      if (fromIdx < 0 || toIdx < 0) {
        return;
      }
      ids.splice(fromIdx, 1);
      ids.splice(toIdx, 0, fromId);
      const byId = {};
      lastSessions.forEach(function(s) {
        byId[s.id] = s;
      });
      const reordered = ids.map(function(id) {
        return byId[id];
      }).filter(Boolean);
      deps.setLastSessions(reordered);
      renderSessionTabs(reordered, deps.getLastActiveSessionId());
      vscode.postMessage({ type: "reorderSessions", sessionIds: ids });
    }
    function hideTabContextMenu() {
      tabContextSessionId = null;
      if (tabContextMenu) {
        tabContextMenu.hidden = true;
        tabContextMenu.innerHTML = "";
      }
    }
    function positionTabContextMenu(x, y) {
      if (!tabContextMenu) return;
      tabContextMenu.hidden = false;
      tabContextMenu.style.left = "0px";
      tabContextMenu.style.top = "0px";
      const rect = tabContextMenu.getBoundingClientRect();
      const maxLeft = Math.max(8, window.innerWidth - rect.width - 8);
      const maxTop = Math.max(8, window.innerHeight - rect.height - 8);
      tabContextMenu.style.left = Math.min(x, maxLeft) + "px";
      tabContextMenu.style.top = Math.min(y, maxTop) + "px";
    }
    function showTabContextMenu(sessionId, clientX, clientY) {
      const locale = deps.getLocale();
      const lastSessions = deps.getLastSessions();
      const session2 = lastSessions.find(function(s) {
        return s.id === sessionId;
      });
      if (!session2 || !tabContextMenu) {
        return;
      }
      tabContextSessionId = sessionId;
      const idx = lastSessions.findIndex(function(s) {
        return s.id === sessionId;
      });
      const canCloseLeft = idx > 0;
      const canCloseRight = idx >= 0 && idx < lastSessions.length - 1;
      const canCloseOthers = lastSessions.length > 1;
      const pinLabel = session2.pinned ? locale.tabContextUnpin : locale.tabContextPin;
      tabContextMenu.innerHTML = '<div class="tab-ctx-sid"><span class="tab-ctx-sid-label">' + escapeHtml2(locale.tabContextSid) + ':</span><span class="tab-ctx-sid-value" title="' + escapeHtml2(sessionId) + '">' + escapeHtml2(sessionId) + '</span><button type="button" class="tab-ctx-sid-copy" data-action="copySid" title="' + escapeHtml2(locale.copySid) + '">' + COPY_ICON_SVG + '</button></div><button type="button" class="tab-ctx-item" data-action="export">' + escapeHtml2(locale.tabContextExport) + '</button><button type="button" class="tab-ctx-item" data-action="copy">' + escapeHtml2(locale.tabContextCopy) + '</button><div class="tab-ctx-divider"></div><button type="button" class="tab-ctx-item" data-action="rename">' + escapeHtml2(locale.tabContextRename) + '</button><button type="button" class="tab-ctx-item" data-action="close">' + escapeHtml2(locale.tabContextClose) + '</button><button type="button" class="tab-ctx-item" data-action="closeOthers"' + (canCloseOthers ? "" : " disabled") + ">" + escapeHtml2(locale.tabContextCloseOthers) + '</button><button type="button" class="tab-ctx-item" data-action="closeLeft"' + (canCloseLeft ? "" : " disabled") + ">" + escapeHtml2(locale.tabContextCloseLeft) + '</button><button type="button" class="tab-ctx-item" data-action="closeRight"' + (canCloseRight ? "" : " disabled") + ">" + escapeHtml2(locale.tabContextCloseRight) + '</button><button type="button" class="tab-ctx-item" data-action="closeAll">' + escapeHtml2(locale.tabContextCloseAll) + '</button><div class="tab-ctx-divider"></div><button type="button" class="tab-ctx-item" data-action="togglePin">' + escapeHtml2(pinLabel) + "</button>";
      tabContextMenu.querySelector('[data-action="copySid"]').addEventListener("click", function(e) {
        e.stopPropagation();
        copyToClipboard(sessionId);
      });
      tabContextMenu.querySelectorAll(".tab-ctx-item[data-action]").forEach(function(item) {
        item.addEventListener("click", function(e) {
          e.stopPropagation();
          if (item.disabled || !tabContextSessionId) return;
          const action = item.dataset.action;
          const targetId = tabContextSessionId;
          hideTabContextMenu();
          if (action === "export") {
            deps.requestSessionExport("export", void 0, targetId);
          } else if (action === "copy") {
            deps.requestSessionExport("copy", void 0, targetId);
          } else if (action === "rename") {
            const tab = tabBar.querySelector('.session-tab[data-id="' + targetId + '"]');
            if (tab) startTabRename(tab, targetId);
          } else if (action === "togglePin") {
            vscode.postMessage({ type: "togglePinSession", sessionId: targetId });
          } else if (action === "close" || action === "closeOthers" || action === "closeLeft" || action === "closeRight" || action === "closeAll") {
            const mode = action === "close" ? "self" : action === "closeOthers" ? "others" : action === "closeLeft" ? "left" : action === "closeRight" ? "right" : "all";
            vscode.postMessage({ type: "closeSessions", sessionId: targetId, mode });
          }
        });
      });
      positionTabContextMenu(clientX, clientY);
    }
    function wireTabDragDrop(tab) {
      tab.draggable = true;
      tab.addEventListener("dragstart", function(e) {
        if (tab.classList.contains("editing")) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", tab.dataset.id || "");
        tab.classList.add("dragging");
      });
      tab.addEventListener("dragend", function() {
        tab.classList.remove("dragging");
        tabBar.querySelectorAll(".session-tab").forEach(function(t) {
          t.classList.remove("drag-over");
        });
      });
      tab.addEventListener("dragover", function(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        tab.classList.add("drag-over");
      });
      tab.addEventListener("dragleave", function() {
        tab.classList.remove("drag-over");
      });
      tab.addEventListener("drop", function(e) {
        e.preventDefault();
        e.stopPropagation();
        tab.classList.remove("drag-over");
        const fromId = e.dataTransfer.getData("text/plain");
        reorderSessionTabs(fromId, tab.dataset.id);
      });
      tab.addEventListener("mousedown", function(e) {
        tab.draggable = !(e.target && e.target.closest && e.target.closest(".tab-close"));
      });
    }
    return { renderSessionTabs, hideTabContextMenu };
  }

  // media/src/sessions/local-history.js
  function createLocalHistory(deps) {
    function removeLocalHistoryDivider() {
      const divider = document.getElementById(LOCAL_HISTORY_DIVIDER_ID);
      if (divider) divider.remove();
    }
    function insertLocalHistoryDivider() {
      const locale = deps.getLocale();
      const placeholder2 = deps.getPlaceholder();
      removeLocalHistoryDivider();
      const divider = document.createElement("div");
      divider.id = LOCAL_HISTORY_DIVIDER_ID;
      divider.className = "local-history-divider";
      divider.title = locale.localHistoryDividerTitle || "";
      divider.textContent = locale.localHistoryDivider || "";
      placeholder2.style.display = "none";
      messagesEl.appendChild(divider);
    }
    function setConnectingPlaceholder() {
      const locale = deps.getLocale();
      const placeholder2 = deps.getPlaceholder();
      if (!placeholder2) return;
      placeholder2.className = "placeholder";
      placeholder2.textContent = "";
      placeholder2.appendChild(document.createTextNode(locale.connectingTitle || ""));
      placeholder2.appendChild(document.createElement("br"));
      const hint = document.createElement("span");
      hint.style.fontSize = "11px";
      hint.style.opacity = "0.6";
      hint.textContent = locale.connectingHint || "";
      placeholder2.appendChild(hint);
    }
    return {
      removeLocalHistoryDivider,
      insertLocalHistoryDivider,
      setConnectingPlaceholder
    };
  }

  // media/src/utils/format.js
  function formatTokenCount(n) {
    const value = Number(n) || 0;
    if (value >= 1e6) {
      return (value / 1e6).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (value >= 1e4) {
      return (value / 1e3).toFixed(1).replace(/\.0$/, "") + "k";
    }
    if (value >= 1e3) {
      return (value / 1e3).toFixed(1) + "k";
    }
    return String(value);
  }

  // media/src/ui/token-usage.js
  function createTokenUsage(deps) {
    function updateTokenUsage(used, size) {
      if (!tokenUsageRing || !tokenUsageArc) return;
      const usedTokens = Math.max(0, Number(used) || 0);
      const totalTokens = Math.max(0, Number(size) || 0);
      if (totalTokens <= 0) {
        tokenUsageRing.hidden = true;
        return;
      }
      const pct = Math.min(100, Math.round(usedTokens / totalTokens * 100));
      const filled = pct / 100 * TOKEN_RING_CIRCUMFERENCE;
      tokenUsageArc.style.strokeDasharray = filled + " " + TOKEN_RING_CIRCUMFERENCE;
      const level = pct >= 90 ? "high" : pct >= 70 ? "medium" : "low";
      tokenUsageRing.dataset.level = level;
      if (tokenUsagePct) {
        tokenUsagePct.textContent = pct + "%";
        tokenUsagePct.style.fontSize = pct >= 100 ? "7px" : "8px";
      }
      const label = deps.localeText(
        "tokenUsageLabel",
        formatTokenCount(usedTokens),
        formatTokenCount(totalTokens),
        pct
      );
      tokenUsageRing.title = label;
      tokenUsageRing.setAttribute("aria-label", label);
      tokenUsageRing.hidden = false;
    }
    return { updateTokenUsage };
  }

  // media/src/sessions/chat-reset.js
  function createChatReset(deps) {
    function resetChatView() {
      deps.cancelSessionMarkdownRender();
      deps.clearChatSearch();
      deps.exitMultiSelectMode();
      deps.removeLocalHistoryDivider();
      deps.forceHideContextAttachPicker();
      const locale = deps.getLocale();
      messagesEl.innerHTML = '<div class="placeholder" id="placeholder">' + escapeHtml2(locale.readyPlaceholder) + "</div>";
      deps.setPlaceholder(document.getElementById("placeholder"));
      deps.resetStreamingState();
      deps.clearToolState();
      deps.resetSessionIndex();
      deps.resetToolAggregation();
      deps.clearPendingPermissions();
      window._hermesRendered = false;
      deps.updateQuickActionBtns();
      deps.updateTokenUsage(0, 0);
      deps.setInputMode(deps.getCanSend() ? "send" : "disabled");
    }
    function newChat() {
      resetChatView();
    }
    function clearChat() {
      resetChatView();
    }
    function restoreHistory(messages, localHistoryOnly) {
      deps.cancelSessionMarkdownRender();
      deps.resetStreamingState();
      deps.clearToolState();
      deps.resetSessionIndex();
      deps.resetToolAggregation();
      deps.clearPendingPermissions();
      window._hermesRendered = false;
      deps.exitMultiSelectMode();
      if (!messages || messages.length === 0) {
        deps.removeLocalHistoryDivider();
        return;
      }
      deps.getPlaceholder().style.display = "none";
      let cursor = 0;
      function appendRestoreBatch() {
        const end = Math.min(cursor + RESTORE_BATCH_SIZE, messages.length);
        for (; cursor < end; cursor++) {
          const m = messages[cursor];
          if (m.role === "permission") {
            deps.restorePermissionMessage(m);
          } else {
            deps.addMessage(m.role, m.text, { restore: true, deferMarkdown: true });
          }
        }
        if (cursor < messages.length) {
          requestAnimationFrame(appendRestoreBatch);
          return;
        }
        deps.updateQuickActionBtns();
        if (localHistoryOnly) {
          deps.insertLocalHistoryDivider();
        } else {
          deps.removeLocalHistoryDivider();
        }
        deps.scheduleSessionMarkdownRender();
      }
      requestAnimationFrame(appendRestoreBatch);
    }
    return { resetChatView, newChat, clearChat, restoreHistory };
  }

  // media/src/utils/path.js
  function basenameFromPath(filePath) {
    if (!filePath) return "hermes";
    const parts = filePath.split(/[/\\]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "hermes";
  }

  // media/src/configure-environment/index.js
  var configureEnvModal = document.getElementById("configureEnvModal");
  var configureEnvPathInput = document.getElementById("configureEnvPathInput");
  var configureEnvPathClearBtn = document.getElementById("configureEnvPathClearBtn");
  var configureEnvBrowseBtn = document.getElementById("configureEnvBrowseBtn");
  var configureEnvDetectBtn = document.getElementById("configureEnvDetectBtn");
  var configureEnvDetectSection = document.getElementById("configureEnvDetectSection");
  var configureEnvDetectCompactIcon = document.getElementById("configureEnvDetectCompactIcon");
  var configureEnvDetectCompactText = document.getElementById("configureEnvDetectCompactText");
  var configureEnvDetectCompactHint = document.getElementById("configureEnvDetectCompactHint");
  var configureEnvDetectToggle = document.getElementById("configureEnvDetectToggle");
  var configureEnvDetectClose = document.getElementById("configureEnvDetectClose");
  var configureEnvDetectDetails = document.getElementById("configureEnvDetectDetails");
  var configureEnvDetectDetailsTitle = document.getElementById("configureEnvDetectDetailsTitle");
  var configureEnvDetectSteps = document.getElementById("configureEnvDetectSteps");
  var configureEnvCandidatesSection = document.getElementById("configureEnvCandidatesSection");
  var configureEnvCandidatesList = document.getElementById("configureEnvCandidatesList");
  var configureEnvCandidatesEmpty = document.getElementById("configureEnvCandidatesEmpty");
  var configureEnvSaveBtn = document.getElementById("configureEnvSaveBtn");
  var configureEnvCancelBtn = document.getElementById("configureEnvCancelBtn");
  var configureEnvSystemBtn = document.getElementById("configureEnvSystemBtn");
  var configureEnvSystemHint = document.getElementById("configureEnvSystemHint");
  var configureEnvCloseBtn = document.getElementById("configureEnvCloseBtn");
  var configureEnvSelectedPath = "";
  var configureEnvDetectFinished = false;
  var configureEnvDetectDetailsOpen = false;
  var configureEnvDetectPanelVisible = false;
  var configureEnvSystemVar = "PATH";
  var configureEnvSystemTarget = "";
  function showConfigureEnvDetectPanel() {
    configureEnvDetectPanelVisible = true;
    if (configureEnvDetectSection) configureEnvDetectSection.hidden = false;
  }
  function updateConfigureEnvPathClearVisibility() {
    if (!configureEnvPathClearBtn || !configureEnvPathInput) return;
    const hasValue = !!configureEnvPathInput.value.trim();
    configureEnvPathClearBtn.hidden = !hasValue;
  }
  function clearConfigureEnvPath() {
    if (!configureEnvPathInput) return;
    configureEnvPathInput.value = "";
    configureEnvSelectedPath = "";
    updateConfigureEnvPathClearVisibility();
    if (configureEnvCandidatesList) {
      configureEnvCandidatesList.querySelectorAll(".configure-env-candidate-row").forEach(function(el) {
        el.classList.remove("is-selected");
      });
    }
    configureEnvPathInput.focus();
  }
  function hideConfigureEnvDetectProgress() {
    configureEnvDetectPanelVisible = false;
    configureEnvDetectFinished = false;
    configureEnvDetectDetailsOpen = false;
    if (configureEnvDetectSection) configureEnvDetectSection.hidden = true;
    setConfigureEnvDetectDetailsOpen(false);
    resetDetectStepsList("configureDetectStep-");
    if (configureEnvDetectCompactText) {
      configureEnvDetectCompactText.textContent = "";
      configureEnvDetectCompactText.title = "";
    }
    setDetectEnvIcon(configureEnvDetectCompactIcon, "running");
  }
  function hideConfigureEnvDetectPanel() {
    hideConfigureEnvDetectProgress();
    if (configureEnvCandidatesSection) {
      configureEnvCandidatesSection.hidden = true;
      configureEnvCandidatesSection.classList.remove("is-visible");
    }
    if (configureEnvCandidatesList) configureEnvCandidatesList.textContent = "";
    if (configureEnvCandidatesEmpty) configureEnvCandidatesEmpty.hidden = true;
  }
  function closeConfigureEnvDetectPanel() {
    const wasVisible = configureEnvDetectPanelVisible;
    hideConfigureEnvDetectProgress();
    if (wasVisible) {
      setConfigureEnvDetecting(false);
      vscode.postMessage({ type: "configureEnvironmentDetectClose" });
    }
  }
  function createConfigureEnvFolderIcon() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 16 16");
    svg.setAttribute("aria-hidden", "true");
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M2 4.5h4.5L8 6h6v7.5H2z");
    svg.appendChild(path);
    return svg;
  }
  function setConfigureEnvDetectDetailsOpen(open) {
    configureEnvDetectDetailsOpen = !!open;
    if (configureEnvDetectDetails) configureEnvDetectDetails.hidden = !configureEnvDetectDetailsOpen;
    if (configureEnvDetectCompactHint) {
      configureEnvDetectCompactHint.classList.toggle("is-open", configureEnvDetectDetailsOpen);
    }
    if (configureEnvDetectToggle) {
      configureEnvDetectToggle.setAttribute("aria-expanded", configureEnvDetectDetailsOpen ? "true" : "false");
      configureEnvDetectToggle.title = configureEnvDetectDetailsOpen ? getLocale().detectEnvironmentHideDetails || "" : getLocale().detectEnvironmentViewDetails || "";
    }
  }
  function setConfigureEnvDetectDetailsTitle() {
    if (!configureEnvDetectDetailsTitle) return;
    configureEnvDetectDetailsTitle.textContent = configureEnvDetectFinished ? getLocale().detectEnvironmentCompleteTitle || getLocale().detectEnvironmentStepSummary || "" : getLocale().detectEnvironmentDetectTitle || getLocale().detectEnvironment || "";
  }
  function updateConfigureEnvSystemHint() {
    if (!configureEnvSystemHint) return;
    const hint = localeText(
      "configureEnvironmentSystemVarHint",
      configureEnvSystemVar || "PATH",
      configureEnvSystemTarget || ""
    );
    configureEnvSystemHint.innerHTML = hint.replace(
      configureEnvSystemVar,
      "<code>" + escapeHtml2(configureEnvSystemVar) + "</code>"
    );
    if (configureEnvSystemBtn) {
      configureEnvSystemBtn.title = localeText(
        "detectEnvironmentConfigureSystemDesc",
        configureEnvSystemVar || "PATH",
        configureEnvSystemTarget || ""
      );
    }
  }
  function setConfigureEnvDetecting(detecting) {
    if (configureEnvBrowseBtn) configureEnvBrowseBtn.disabled = !!detecting;
    if (configureEnvDetectBtn) configureEnvDetectBtn.disabled = !!detecting;
    if (configureEnvSaveBtn) configureEnvSaveBtn.disabled = !!detecting;
    if (configureEnvSystemBtn) configureEnvSystemBtn.disabled = !!detecting;
  }
  function resetConfigureEnvDetectPanel() {
    hideConfigureEnvDetectPanel();
    configureEnvSelectedPath = "";
  }
  function openConfigureEnvModal(currentPath, systemEnvVar, systemEnvTarget) {
    if (!configureEnvModal) return;
    configureEnvSystemVar = systemEnvVar || "PATH";
    configureEnvSystemTarget = systemEnvTarget || "";
    updateConfigureEnvSystemHint();
    resetConfigureEnvDetectPanel();
    if (configureEnvPathInput) configureEnvPathInput.value = currentPath || "";
    updateConfigureEnvPathClearVisibility();
    configureEnvModal.classList.add("is-open");
    if (configureEnvPathInput) configureEnvPathInput.focus();
  }
  function closeConfigureEnvModal() {
    if (!configureEnvModal) return;
    configureEnvModal.classList.remove("is-open");
    resetConfigureEnvDetectPanel();
  }
  function initConfigureEnvDetectStart() {
    configureEnvDetectFinished = false;
    ensureDetectStepsList(configureEnvDetectSteps, "configureDetectStep-");
    resetDetectStepsList("configureDetectStep-");
    showConfigureEnvDetectPanel();
    setConfigureEnvDetectDetailsOpen(false);
    setConfigureEnvDetectDetailsTitle();
    if (configureEnvDetectToggle) {
      configureEnvDetectToggle.title = getLocale().detectEnvironmentViewDetails || "";
    }
    setDetectEnvIcon(configureEnvDetectCompactIcon, "running");
    if (configureEnvDetectCompactText) {
      const text = formatDetectProgressDisplay("0%");
      configureEnvDetectCompactText.textContent = text;
      configureEnvDetectCompactText.title = text;
    }
  }
  function updateConfigureEnvDetectProgress(msg) {
    if (!configureEnvDetectSection || !configureEnvDetectPanelVisible) return;
    updateDetectStepsList(
      msg,
      "configureDetectStep-",
      configureEnvDetectCompactIcon,
      configureEnvDetectCompactText
    );
  }
  function selectConfigureEnvCandidate(path, rowEl) {
    configureEnvSelectedPath = path || "";
    if (configureEnvPathInput) {
      configureEnvPathInput.value = configureEnvSelectedPath;
      updateConfigureEnvPathClearVisibility();
    }
    if (configureEnvCandidatesList) {
      configureEnvCandidatesList.querySelectorAll(".configure-env-candidate-row").forEach(function(el) {
        el.classList.toggle("is-selected", el === rowEl);
      });
    }
  }
  function renderConfigureEnvCandidates(executables) {
    if (!configureEnvCandidatesSection || !configureEnvCandidatesList || !configureEnvCandidatesEmpty) return;
    configureEnvCandidatesList.textContent = "";
    const list = Array.isArray(executables) ? executables : [];
    configureEnvCandidatesSection.hidden = false;
    configureEnvCandidatesSection.classList.remove("is-visible");
    void configureEnvCandidatesSection.offsetWidth;
    configureEnvCandidatesSection.classList.add("is-visible");
    if (list.length === 0) {
      configureEnvCandidatesEmpty.hidden = false;
      configureEnvCandidatesEmpty.textContent = getLocale().configureEnvironmentNoCandidates || "";
      return;
    }
    configureEnvCandidatesEmpty.hidden = true;
    list.forEach(function(item, index) {
      const li = document.createElement("li");
      li.className = "configure-env-candidate-row";
      if (item.path === configureEnvSelectedPath) {
        li.classList.add("is-selected");
      }
      li.style.animationDelay = index * 0.06 + "s";
      const body = document.createElement("div");
      body.className = "configure-env-candidate-body";
      const icon = document.createElement("span");
      icon.className = "configure-env-candidate-icon detect-env-icon " + (item.verified ? "ok" : "fail");
      const main = document.createElement("div");
      main.className = "configure-env-candidate-main";
      const head = document.createElement("div");
      head.className = "configure-env-candidate-head";
      const name = document.createElement("span");
      name.className = "configure-env-candidate-name";
      name.textContent = basenameFromPath(item.path);
      const badge = document.createElement("span");
      badge.className = "configure-env-candidate-badge " + (item.verified ? "is-verified" : "is-unverified");
      badge.textContent = item.verified ? getLocale().detectEnvironmentCandidateVerified || "verified" : getLocale().detectEnvironmentCandidateUnverified || "unverified";
      const tag = document.createElement("span");
      tag.className = "configure-env-candidate-tag";
      tag.textContent = item.source || "";
      head.appendChild(name);
      head.appendChild(badge);
      if (item.source) head.appendChild(tag);
      const pathEl = document.createElement("div");
      pathEl.className = "configure-env-candidate-path";
      pathEl.textContent = item.path || "";
      main.appendChild(head);
      main.appendChild(pathEl);
      if (item.version) {
        const versionEl = document.createElement("div");
        versionEl.className = "configure-env-candidate-version";
        versionEl.textContent = item.version;
        main.appendChild(versionEl);
      }
      body.appendChild(icon);
      body.appendChild(main);
      body.addEventListener("click", function() {
        selectConfigureEnvCandidate(item.path || "", li);
      });
      const actions = document.createElement("div");
      actions.className = "configure-env-candidate-actions";
      const openBtn = document.createElement("button");
      openBtn.type = "button";
      openBtn.className = "configure-env-candidate-open";
      openBtn.title = getLocale().configureEnvironmentOpenDirectory || "Open folder";
      openBtn.setAttribute("aria-label", openBtn.title);
      openBtn.appendChild(createConfigureEnvFolderIcon());
      openBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!item.path) return;
        vscode.postMessage({
          type: "configureEnvironmentOpenDirectory",
          path: item.path
        });
      });
      const selectBtn = document.createElement("button");
      selectBtn.type = "button";
      selectBtn.className = "configure-env-candidate-select";
      selectBtn.setAttribute("aria-label", getLocale().configureEnvironmentSelectCandidate || "Select");
      selectBtn.textContent = "\u2713";
      selectBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        selectConfigureEnvCandidate(item.path || "", li);
      });
      actions.appendChild(openBtn);
      actions.appendChild(selectBtn);
      li.appendChild(body);
      li.appendChild(actions);
      configureEnvCandidatesList.appendChild(li);
    });
  }
  function finishConfigureEnvDetect(msg) {
    setConfigureEnvDetecting(false);
    if (msg.status === "cancelled" || !configureEnvDetectPanelVisible) {
      hideConfigureEnvDetectProgress();
      return;
    }
    configureEnvDetectFinished = true;
    setConfigureEnvDetectDetailsTitle();
    const summaryStatus = msg.status === "ready" ? "ok" : msg.executables && msg.executables.length ? "ok" : "fail";
    updateConfigureEnvDetectProgress({
      step: "summary",
      status: summaryStatus,
      reportStatus: msg.status,
      brief: "100%",
      detail: msg.summary
    });
    renderConfigureEnvCandidates(msg.executables || []);
  }
  function startConfigureEnvDetect() {
    if (!configureEnvDetectBtn || configureEnvDetectBtn.disabled) return;
    if (configureEnvCandidatesSection) {
      configureEnvCandidatesSection.hidden = true;
      configureEnvCandidatesSection.classList.remove("is-visible");
    }
    if (configureEnvCandidatesList) configureEnvCandidatesList.textContent = "";
    if (configureEnvCandidatesEmpty) configureEnvCandidatesEmpty.hidden = true;
    configureEnvSelectedPath = configureEnvPathInput ? configureEnvPathInput.value.trim() : "";
    setConfigureEnvDetecting(true);
    initConfigureEnvDetectStart();
    vscode.postMessage({
      type: "configureEnvironmentDetect",
      currentPath: configureEnvPathInput ? configureEnvPathInput.value.trim() : ""
    });
  }
  function saveConfigureEnvPath() {
    if (!configureEnvSaveBtn || configureEnvSaveBtn.disabled) return;
    vscode.postMessage({
      type: "configureEnvironmentSave",
      path: configureEnvPathInput ? configureEnvPathInput.value.trim() : ""
    });
  }
  function browseConfigureEnvPath() {
    if (!configureEnvBrowseBtn || configureEnvBrowseBtn.disabled) return;
    vscode.postMessage({ type: "configureEnvironmentBrowse" });
  }
  function requestConfigureEnvSystemPath() {
    if (!configureEnvSystemBtn || configureEnvSystemBtn.disabled) return;
    vscode.postMessage({
      type: "configureEnvironmentSystem",
      path: configureEnvPathInput ? configureEnvPathInput.value.trim() : ""
    });
  }
  function bindConfigureEnvEvents() {
    if (configureEnvBrowseBtn) configureEnvBrowseBtn.addEventListener("click", browseConfigureEnvPath);
    if (configureEnvDetectBtn) configureEnvDetectBtn.addEventListener("click", startConfigureEnvDetect);
    if (configureEnvDetectClose) {
      configureEnvDetectClose.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        closeConfigureEnvDetectPanel();
      });
    }
    if (configureEnvPathClearBtn) {
      configureEnvPathClearBtn.addEventListener("click", function(e) {
        e.preventDefault();
        e.stopPropagation();
        clearConfigureEnvPath();
      });
    }
    if (configureEnvPathInput) {
      configureEnvPathInput.addEventListener("input", function() {
        configureEnvSelectedPath = configureEnvPathInput.value.trim();
        updateConfigureEnvPathClearVisibility();
      });
    }
    if (configureEnvDetectToggle) {
      configureEnvDetectToggle.addEventListener("click", function(e) {
        e.stopPropagation();
        setConfigureEnvDetectDetailsOpen(!configureEnvDetectDetailsOpen);
      });
    }
    if (configureEnvSaveBtn) configureEnvSaveBtn.addEventListener("click", saveConfigureEnvPath);
    if (configureEnvCancelBtn) configureEnvCancelBtn.addEventListener("click", closeConfigureEnvModal);
    if (configureEnvCloseBtn) configureEnvCloseBtn.addEventListener("click", closeConfigureEnvModal);
    if (configureEnvSystemBtn) configureEnvSystemBtn.addEventListener("click", requestConfigureEnvSystemPath);
    if (configureEnvModal) {
      configureEnvModal.addEventListener("click", function(e) {
        if (e.target === configureEnvModal) closeConfigureEnvModal();
      });
    }
  }
  function applyConfigureEnvBrowsePath(path) {
    if (!configureEnvPathInput) return;
    configureEnvPathInput.value = path;
    configureEnvSelectedPath = path;
    updateConfigureEnvPathClearVisibility();
  }

  // media/src/locale/apply-locale.js
  function createApplyLocale(deps) {
    function applyLocale2() {
      const locale = deps.getLocale();
      const toolbarStatus = document.getElementById("toolbarStatus");
      const retryBtnEl = document.getElementById("retryBtn");
      const profileBtnEl = document.getElementById("profileBtn");
      const modelBtnEl = document.getElementById("modelBtn");
      const cancelBtnEl = document.getElementById("cancelBtn");
      const filePickerElLocal = document.getElementById("filePicker");
      if (toolbarStatus) toolbarStatus.title = locale.connectionStatus;
      if (retryBtnEl) retryBtnEl.title = locale.retry;
      const detectEnvBtnEl = document.getElementById("detectEnvBtn");
      if (detectEnvBtnEl) {
        detectEnvBtnEl.textContent = locale.detectEnvironment || "";
        detectEnvBtnEl.title = locale.detectEnvironment || "";
      }
      const profileLabelText = document.getElementById("profileLabelText");
      if (profileLabelText) profileLabelText.textContent = locale.profile;
      if (profileBtnEl) profileBtnEl.title = locale.switchProfile;
      const profilesHeader = document.getElementById("profilesHeader");
      if (profilesHeader) profilesHeader.textContent = locale.profiles;
      if (modelBtnEl) modelBtnEl.title = locale.switchModel;
      const modelsHeader = document.getElementById("modelsHeader");
      if (modelsHeader) modelsHeader.textContent = locale.models;
      deps.refreshModelButtonDisplay();
      if (contextAttachHeaderLead) contextAttachHeaderLead.textContent = locale.contextAttachHeaderLead || "";
      if (contextAttachHeaderRest) contextAttachHeaderRest.textContent = locale.contextAttachHeaderRest || "";
      if (contextAttachHelp) {
        const tip = locale.contextAttachTooltip || "";
        contextAttachHelp.title = tip;
        contextAttachHelp.setAttribute("aria-label", tip);
      }
      if (contextAttachTooltipEl) {
        contextAttachTooltipEl.textContent = locale.contextAttachTooltip || "";
      }
      const contextAttachSendTitle = document.getElementById("contextAttachSendModalTitle");
      const contextAttachSendBody = document.getElementById("contextAttachSendModalBody");
      const contextAttachSendYesBtn = document.getElementById("contextAttachSendYesBtn");
      const contextAttachSendNoBtn = document.getElementById("contextAttachSendNoBtn");
      if (contextAttachSendTitle) contextAttachSendTitle.textContent = locale.contextAttachCustom || "";
      if (contextAttachSendBody) contextAttachSendBody.textContent = locale.contextAttachSendPrompt || "";
      if (contextAttachSendYesBtn) contextAttachSendYesBtn.textContent = locale.contextAttachSendYes || "";
      if (contextAttachSendNoBtn) contextAttachSendNoBtn.textContent = locale.contextAttachSendNo || "";
      if (multiSelectAttachConfirmBtn) multiSelectAttachConfirmBtn.textContent = locale.contextAttachConfirm || "";
      deps.updateContextAttachButtonLabel();
      deps.renderContextAttachOptions();
      const newChatLabelFull = document.getElementById("newChatLabelFull");
      if (newChatLabelFull) newChatLabelFull.textContent = locale.newChatBtn;
      if (newChatBtn) newChatBtn.title = locale.newChatBtn;
      const detectEnvClose = document.getElementById("detectEnvClose");
      if (detectEnvClose) {
        detectEnvClose.title = locale.detectEnvironmentClose || "";
        detectEnvClose.setAttribute("aria-label", locale.detectEnvironmentClose || "Close");
      }
      if (detectEnvPanelReady) {
        setDetectEnvDetailsTitle();
        const toggle = document.getElementById("detectEnvToggle");
        if (toggle) {
          toggle.title = detectEnvDetailsOpen ? locale.detectEnvironmentHideDetails || "" : locale.detectEnvironmentViewDetails || "";
        }
        const hint = document.getElementById("detectEnvCompactHint");
        if (hint) hint.classList.toggle("is-open", detectEnvDetailsOpen);
        DETECT_STEP_IDS.forEach(function(stepId) {
          const row = document.getElementById("detectStep-" + stepId);
          if (!row) return;
          const label = row.querySelector(".detect-env-step-label");
          if (label) label.textContent = detectStepLabel(stepId);
        });
      }
      if (inputResizeHandle) {
        inputResizeHandle.title = locale.resizeHandle;
        inputResizeHandle.setAttribute("aria-label", locale.resizeHandle);
      }
      if (filePickerElLocal) filePickerElLocal.setAttribute("aria-label", locale.filePicker);
      if (chatSearchInput) {
        chatSearchInput.placeholder = locale.searchChat;
        chatSearchInput.setAttribute("aria-label", locale.searchChat);
      }
      if (chatSearchPrev) {
        chatSearchPrev.title = locale.searchPrev;
        chatSearchPrev.setAttribute("aria-label", locale.searchPrev);
      }
      if (chatSearchNext) {
        chatSearchNext.title = locale.searchNext;
        chatSearchNext.setAttribute("aria-label", locale.searchNext);
      }
      if (clearChatBtn) {
        clearChatBtn.title = locale.clearChat;
        clearChatBtn.setAttribute("aria-label", locale.clearChat);
      }
      if (clearInputBtn) {
        clearInputBtn.title = locale.clearInput;
        clearInputBtn.setAttribute("aria-label", locale.clearInput);
      }
      if (copySessionBtn) {
        copySessionBtn.title = locale.copySession;
        copySessionBtn.setAttribute("aria-label", locale.copySession);
      }
      if (multiSelectAllBtn) multiSelectAllBtn.textContent = locale.multiSelectAll;
      if (multiSelectDeleteBtn) multiSelectDeleteBtn.textContent = locale.multiSelectDelete;
      if (multiSelectCopyBtn) multiSelectCopyBtn.textContent = locale.multiSelectCopy;
      if (multiSelectExportBtn) multiSelectExportBtn.textContent = locale.multiSelectExport;
      if (multiSelectExitBtn) multiSelectExitBtn.textContent = locale.multiSelectExit;
      deps.updateMultiSelectToolbar();
      if (quickToggleBtn) {
        quickToggleBtn.title = locale.quickActions;
        quickToggleBtn.setAttribute("aria-label", locale.quickActions);
      }
      if (inputEl) inputEl.placeholder = locale.inputPlaceholder;
      if (tokenUsageRing) {
        tokenUsageRing.title = locale.tokenUsage;
        tokenUsageRing.setAttribute("aria-label", locale.tokenUsage);
      }
      if (sendBtn) sendBtn.textContent = locale.send;
      const stopBtnLabel = document.getElementById("stopBtnLabel");
      if (stopBtnLabel) stopBtnLabel.textContent = locale.stop;
      if (cancelBtnEl) {
        cancelBtnEl.title = locale.cancelResponse;
        cancelBtnEl.setAttribute("aria-label", locale.cancelResponse);
      }
      const logModalTitle = document.getElementById("logModalTitle");
      if (logModalTitle) logModalTitle.textContent = locale.hermesLogs;
      const renderBannerText = document.querySelector("#" + SESSION_RENDER_BANNER_ID + " .session-render-text");
      if (renderBannerText) renderBannerText.textContent = locale.sessionRendering || "";
      const copyLogBtn = document.getElementById("copyLogBtn");
      if (copyLogBtn) copyLogBtn.textContent = locale.copy;
      const clearLogBtn = document.getElementById("clearLogBtn");
      if (clearLogBtn) clearLogBtn.textContent = locale.clear;
      deps.applyInfoModalLocale();
      const configureEnvModalTitle = document.getElementById("configureEnvModalTitle");
      if (configureEnvModalTitle) configureEnvModalTitle.textContent = locale.configureEnvironmentTitle || "";
      const configureEnvPathLabel = document.getElementById("configureEnvPathLabel");
      if (configureEnvPathLabel) configureEnvPathLabel.textContent = locale.configureEnvironmentPathLabel || "";
      if (configureEnvPathInput) {
        configureEnvPathInput.placeholder = locale.configureEnvironmentPathPlaceholder || "";
      }
      if (configureEnvPathClearBtn) {
        configureEnvPathClearBtn.setAttribute(
          "aria-label",
          locale.configureEnvironmentClearPath || "Clear path"
        );
        configureEnvPathClearBtn.title = locale.configureEnvironmentClearPath || "Clear path";
      }
      updateConfigureEnvPathClearVisibility();
      if (configureEnvBrowseBtn) configureEnvBrowseBtn.textContent = locale.configureEnvironmentBrowse || "";
      if (configureEnvDetectBtn) configureEnvDetectBtn.textContent = locale.configureEnvironmentDetect || "";
      const configureEnvCandidatesTitle = document.getElementById("configureEnvCandidatesTitle");
      if (configureEnvCandidatesTitle) {
        configureEnvCandidatesTitle.textContent = locale.configureEnvironmentCandidatesTitle || "";
      }
      if (configureEnvCandidatesEmpty) {
        configureEnvCandidatesEmpty.textContent = locale.configureEnvironmentNoCandidates || "";
      }
      if (configureEnvSaveBtn) configureEnvSaveBtn.textContent = locale.configureEnvironmentSave || "";
      if (configureEnvCancelBtn) configureEnvCancelBtn.textContent = locale.configureEnvironmentCancel || "";
      if (configureEnvSystemBtn) {
        configureEnvSystemBtn.textContent = locale.detectEnvironmentConfigureSystem || "";
      }
      updateConfigureEnvSystemHint();
      refreshDetectStepLabels(configureEnvDetectSteps, "configureDetectStep-");
      setConfigureEnvDetectDetailsTitle();
      if (configureEnvDetectToggle) {
        configureEnvDetectToggle.title = configureEnvDetectDetailsOpen ? locale.detectEnvironmentHideDetails || "" : locale.detectEnvironmentViewDetails || "";
      }
      if (statusText) statusText.textContent = locale.statusDisconnected;
      deps.refreshAllPermissionLocale();
      deps.refreshAllAuxiliaryLocale();
    }
    return { applyLocale: applyLocale2 };
  }

  // media/src/app/bootstrap/create-app-services.js
  function createAppServices(ctx) {
    const localHistory = createLocalHistory({
      getLocale: ctx.getLocale,
      getPlaceholder: ctx.getPlaceholder
    });
    const tokenUsage = createTokenUsage({ localeText: ctx.localeText });
    const {
      updateQuickActionBtns,
      appendToInput,
      insertIntoInput,
      insertToEditor
    } = ctx.quickActions;
    const {
      removeLocalHistoryDivider,
      insertLocalHistoryDivider
    } = localHistory;
    const permissions = createPermissions({
      getLocale: ctx.getLocale,
      localeText: ctx.localeText,
      assignSessionIndex: ctx.assignSessionIndex,
      finalizeAssistantBubble: ctx.finalizeAssistantBubble,
      placeholder: ctx.getPlaceholder(),
      enableStopAfterAgentOutput: ctx.enableStopAfterAgentOutput,
      maybeScrollToBottom: ctx.maybeScrollToBottom
    });
    const {
      restorePermissionMessage,
      updatePermissionContent,
      showPermissionRequest,
      dismissPermissionRequest
    } = permissions;
    const chatReset = createChatReset({
      getLocale: ctx.getLocale,
      getPlaceholder: ctx.getPlaceholder,
      setPlaceholder: ctx.setPlaceholder,
      getCanSend: ctx.session.getCanSend,
      cancelSessionMarkdownRender: () => ctx.sessionRender.cancelSessionMarkdownRender(),
      scheduleSessionMarkdownRender: () => ctx.sessionRender.scheduleSessionMarkdownRender(),
      clearChatSearch: () => ctx.chatSearch.clearChatSearch(),
      exitMultiSelectMode: () => ctx.multiSelect.exitMultiSelectMode(),
      removeLocalHistoryDivider: () => localHistory.removeLocalHistoryDivider(),
      insertLocalHistoryDivider: () => localHistory.insertLocalHistoryDivider(),
      forceHideContextAttachPicker: () => ctx.contextAttach.forceHideContextAttachPicker(),
      resetStreamingState: ctx.session.resetStreamingState,
      clearToolState: () => ctx.auxiliary.clearToolState(),
      resetSessionIndex: ctx.session.resetSessionIndex,
      resetToolAggregation: () => ctx.auxiliary.resetToolAggregation(),
      clearPendingPermissions: () => permissions.clearPendingPermissions(),
      updateQuickActionBtns,
      updateTokenUsage: tokenUsage.updateTokenUsage,
      setInputMode: ctx.setInputMode,
      restorePermissionMessage: (...a) => permissions.restorePermissionMessage(...a),
      addMessage: (...a) => ctx.messages.addMessage(...a)
    });
    const { newChat, clearChat, restoreHistory } = chatReset;
    const { setupContentBlocks, closeInsertDropdowns } = createContentBlocks({
      getLocale: ctx.getLocale,
      appendToInput,
      insertToEditor
    });
    const applyLocale2 = createApplyLocale({
      getLocale: ctx.getLocale,
      refreshModelButtonDisplay: () => ctx.pickers.refreshModelButtonDisplay(),
      updateContextAttachButtonLabel: () => ctx.contextAttach.updateContextAttachButtonLabel(),
      renderContextAttachOptions: () => ctx.contextAttach.renderContextAttachOptions(),
      updateMultiSelectToolbar: () => ctx.multiSelect.updateMultiSelectToolbar(),
      applyInfoModalLocale: () => ctx.infoModals.applyInfoModalLocale(),
      refreshAllPermissionLocale: () => permissions.refreshAllPermissionLocale(),
      refreshAllAuxiliaryLocale: () => ctx.auxiliary.refreshAllAuxiliaryLocale()
    }).applyLocale;
    const { renderSessionTabs, hideTabContextMenu } = createSessionTabs({
      getLocale: ctx.getLocale,
      getLastSessions: ctx.session.getLastSessions,
      setLastSessions: ctx.session.setLastSessions,
      getLastActiveSessionId: ctx.session.getLastActiveSessionId,
      setLastActiveSessionId: ctx.session.setLastActiveSessionId,
      getActiveSessionId: ctx.session.getActiveSessionId,
      setActiveSessionId: ctx.session.setActiveSessionId,
      requestSwitchSession: ctx.requestSwitchSession,
      requestSessionExport: ctx.requestSessionExport
    });
    return {
      localHistory,
      tokenUsage,
      permissions,
      chatReset,
      setupContentBlocks,
      closeInsertDropdowns,
      applyLocale: applyLocale2,
      renderSessionTabs,
      hideTabContextMenu,
      newChat,
      clearChat,
      restoreHistory,
      restorePermissionMessage,
      updatePermissionContent,
      showPermissionRequest,
      dismissPermissionRequest,
      insertLocalHistoryDivider,
      insertIntoInput
    };
  }

  // media/src/bridge/handlers/environment.js
  function createEnvironmentHandlers(deps) {
    return {
      detectEnvironmentStart(msg) {
        initDetectEnvironmentStart(msg.mode || "manual");
        if (deps.placeholder) deps.placeholder.style.display = "none";
      },
      detectEnvironmentProgress(msg) {
        updateDetectEnvironmentStep(msg);
      },
      detectEnvironmentEnd(msg) {
        finishDetectEnvironmentPanel(msg);
      },
      configureEnvironmentOpen(msg) {
        openConfigureEnvModal(msg.currentPath || "", msg.systemEnvVar, msg.systemEnvTarget);
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
          setDetectEnvIcon(configureEnvDetectCompactIcon, "fail");
        }
      },
      configureEnvironmentSaveResult(msg) {
        if (msg.ok) {
          closeConfigureEnvModal();
        } else if (msg.error && configureEnvDetectCompactText) {
          showConfigureEnvDetectPanel();
          configureEnvDetectCompactText.textContent = msg.error;
          setDetectEnvIcon(configureEnvDetectCompactIcon, "fail");
        }
      }
    };
  }

  // media/src/bridge/handlers/messages.js
  function createMessageHandlers(deps) {
    return {
      addMessage(msg) {
        if (!deps.isMessageForActiveSession(msg)) {
          return;
        }
        if (msg.role === "assistant") {
          deps.addMessage("assistant", msg.text);
        } else if (msg.role === "tool" && msg.toolCallId) {
          deps.handleToolMessage(msg.text, msg.toolCallId);
        } else if (msg.role === "thought") {
          if (deps.getThoughtMsgId()) {
            const el = document.getElementById(deps.getThoughtMsgId());
            if (el) {
              deps.setAuxiliaryContent(el, msg.text);
              deps.setAuxMessageLive(el, true);
              deps.maybeScrollToBottom();
              return;
            }
          }
          const id = deps.addMessage("thought", msg.text);
          deps.setThoughtMsgId(id);
        } else {
          deps.addMessage(msg.role, msg.text);
        }
      },
      restoreHistory(msg) {
        deps.restoreHistory(msg.messages, msg.localHistoryOnly);
      },
      finishAssistantBubble(msg) {
        if (!deps.isMessageForActiveSession(msg)) {
          return;
        }
        deps.finalizeAssistantBubble();
        if (deps.getIsPrompting() && !deps.getAwaitingFirstChunk()) {
          deps.setInputMode("stop");
        }
      },
      permissionRequest(msg) {
        deps.showPermissionRequest(msg);
      },
      permissionUpdate(msg) {
        if (msg.id && deps.pendingPermissions.has(msg.id)) {
          deps.updatePermissionContent(
            deps.pendingPermissions.get(msg.id),
            msg.title,
            msg.detail
          );
        }
      },
      permissionDismiss(msg) {
        deps.dismissPermissionRequest(msg.id, msg.status || deps.getLocale().permissionCancelled);
      }
    };
  }

  // media/src/bridge/handlers/ui.js
  function createUiHandlers(deps) {
    return {
      status(msg) {
        if (!deps.isMessageForActiveSession(msg)) {
          return;
        }
        if (msg.status === "connecting") {
          deps.setConnectionAttempted(true);
        }
        deps.updateStatus(msg.status, msg.message);
        if (msg.status === "ready") {
          deps.setIsPrompting(false);
          deps.setAwaitingFirstChunk(false);
          deps.resetToolAggregation();
          deps.finishStreaming();
          deps.setCanSend(true);
          deps.inputEl.disabled = false;
          deps.setInputMode("send");
          deps.placeholder.style.display = "none";
          if (!window._hermesRendered) {
            deps.scheduleSessionMarkdownRender();
          }
          deps.maybeFocusInputAfterResponse();
        } else if (msg.status === "prompting") {
          deps.setIsPrompting(true);
          deps.resetAutoScrollFollow();
          deps.setCanSend(false);
          deps.inputEl.disabled = true;
          if (!deps.getAwaitingFirstChunk()) {
            deps.setInputMode("stop");
          }
        } else if (msg.status === "error") {
          deps.setIsPrompting(false);
          deps.setAwaitingFirstChunk(false);
          deps.setCanSend(false);
          deps.inputEl.disabled = true;
          deps.finishStreaming();
          deps.setInputMode("disabled");
          deps.updateTokenUsage(0, 0);
          const locale = deps.getLocale();
          const errText = msg.message || locale.connectionError;
          deps.placeholder.innerHTML = deps.buildConnectionErrorPlaceholder(errText);
          deps.bindConnectionErrorActions();
          deps.placeholder.style.display = "block";
        } else if (msg.status === "idle") {
          deps.setIsPrompting(false);
          deps.setAwaitingFirstChunk(false);
          deps.setCanSend(false);
          deps.inputEl.disabled = true;
          deps.finishStreaming();
          deps.setInputMode("disabled");
          deps.updateTokenUsage(0, 0);
        }
      },
      setLocale(msg) {
        if (!msg.locale) return;
        deps.setLocale(msg.locale);
        deps.refreshLocale();
        if (deps.getLastSessions().length > 0) {
          deps.renderSessionTabs(deps.getLastSessions(), deps.getLastActiveSessionId());
        }
        const divider = document.getElementById(deps.LOCAL_HISTORY_DIVIDER_ID);
        if (divider) {
          const locale = deps.getLocale();
          divider.textContent = locale.localHistoryDivider || "";
          divider.title = locale.localHistoryDividerTitle || "";
        }
      },
      sessionExport(msg) {
        if (msg.action === "copy" && msg.markdown) {
          deps.copyToClipboard(msg.markdown);
        } else if (msg.action === "export" && msg.markdown) {
          deps.downloadSessionMarkdown(msg.markdown, msg.filename);
        }
      },
      agentList(msg) {
        deps.renderProfileList(msg.agents || msg.profiles);
      },
      profileList(msg) {
        deps.renderProfileList(msg.agents || msg.profiles);
      },
      modelList(msg) {
        deps.renderModelList(msg);
      },
      log(msg) {
        if (msg.level === "error" || msg.level === "warning") {
          deps.appendLog(msg.line, msg.level);
        }
      },
      config(msg) {
        window._showThoughts = msg.showThoughts;
        window._showToolCalls = msg.showToolCalls;
        document.querySelectorAll(".message-group.thought").forEach(function(el) {
          el.style.display = msg.showThoughts ? "" : "none";
        });
        document.querySelectorAll(".message-group.tool").forEach(function(el) {
          el.style.display = msg.showToolCalls ? "" : "none";
        });
      },
      activeAgent(msg) {
        if (msg.name) {
          document.getElementById("profileLabel").textContent = msg.name;
        }
      },
      activeProfile(msg) {
        if (msg.name) {
          document.getElementById("profileLabel").textContent = msg.name;
        }
      },
      pluginInfo(msg) {
        deps.setPluginInfo(msg);
        deps.renderAboutContent();
      },
      fileList(msg) {
        if (deps.getFilePickerRequestId() === msg.requestId) {
          deps.renderFilePickerItems(msg.files || []);
        }
      },
      filePreview(msg) {
        if (deps.previewRequests.has(msg.requestId)) {
          const anchor = deps.previewRequests.get(msg.requestId);
          deps.previewRequests.delete(msg.requestId);
          deps.showFilePreview(msg.path || "", msg.content, msg.error);
          deps.positionFilePreview(anchor);
        }
      },
      showContextAttach() {
        deps.showContextAttachPicker();
      },
      hideContextAttach() {
        deps.hideContextAttachPicker();
      },
      markSessionReset() {
        deps.insertLocalHistoryDivider();
      }
    };
  }

  // media/src/bridge/handlers/simple.js
  function createSimpleHandlers(deps) {
    return {
      tokenUsage(msg) {
        deps.updateTokenUsage(msg.used, msg.size);
      },
      newChat() {
        deps.newChat();
      },
      clearChat() {
        deps.clearChat();
      },
      insertInput(msg) {
        deps.insertIntoInput(msg.text || "");
      },
      sessionList(msg) {
        deps.renderSessionTabs(msg.sessions, msg.activeSessionId);
      },
      openLogs() {
        deps.openLogModal();
      },
      openAbout() {
        deps.renderAboutContent();
        deps.showModal(deps.aboutModal);
      },
      openHelp() {
        deps.showModal(deps.helpModal);
      },
      openFaq() {
        deps.showModal(deps.faqModal);
      }
    };
  }

  // media/src/bridge/app-handlers.js
  function createAppHandlers(deps) {
    return {
      ...createEnvironmentHandlers({ placeholder: deps.placeholder }),
      ...createMessageHandlers({
        isMessageForActiveSession: deps.isMessageForActiveSession,
        addMessage: deps.addMessage,
        handleToolMessage: deps.handleToolMessage,
        getThoughtMsgId: deps.getThoughtMsgId,
        setThoughtMsgId: deps.setThoughtMsgId,
        setAuxiliaryContent: deps.setAuxiliaryContent,
        setAuxMessageLive: deps.setAuxMessageLive,
        maybeScrollToBottom: deps.maybeScrollToBottom,
        restoreHistory: deps.restoreHistory,
        finalizeAssistantBubble: deps.finalizeAssistantBubble,
        getIsPrompting: deps.getIsPrompting,
        getAwaitingFirstChunk: deps.getAwaitingFirstChunk,
        setInputMode: deps.setInputMode,
        showPermissionRequest: deps.showPermissionRequest,
        pendingPermissions: deps.pendingPermissions,
        updatePermissionContent: deps.updatePermissionContent,
        dismissPermissionRequest: deps.dismissPermissionRequest,
        getLocale: deps.getLocale
      }),
      ...createUiHandlers({
        isMessageForActiveSession: deps.isMessageForActiveSession,
        setConnectionAttempted: deps.setConnectionAttempted,
        updateStatus: deps.updateStatus,
        setIsPrompting: deps.setIsPrompting,
        setAwaitingFirstChunk: deps.setAwaitingFirstChunk,
        resetToolAggregation: deps.resetToolAggregation,
        finishStreaming: deps.finishStreaming,
        setCanSend: deps.setCanSend,
        inputEl: deps.inputEl,
        setInputMode: deps.setInputMode,
        placeholder: deps.placeholder,
        scheduleSessionMarkdownRender: deps.scheduleSessionMarkdownRender,
        maybeFocusInputAfterResponse: deps.maybeFocusInputAfterResponse,
        getAwaitingFirstChunk: deps.getAwaitingFirstChunk,
        resetAutoScrollFollow: deps.resetAutoScrollFollow,
        updateTokenUsage: deps.updateTokenUsage,
        getLocale: deps.getLocale,
        buildConnectionErrorPlaceholder: deps.buildConnectionErrorPlaceholder,
        bindConnectionErrorActions: deps.bindConnectionErrorActions,
        setLocale,
        refreshLocale: deps.refreshLocale,
        getLastSessions: deps.getLastSessions,
        getLastActiveSessionId: deps.getLastActiveSessionId,
        renderSessionTabs: deps.renderSessionTabs,
        LOCAL_HISTORY_DIVIDER_ID,
        copyToClipboard,
        downloadSessionMarkdown,
        renderProfileList: deps.renderProfileList,
        renderModelList: deps.renderModelList,
        appendLog: deps.appendLog,
        setPluginInfo: deps.setPluginInfo,
        renderAboutContent: deps.renderAboutContent,
        getFilePickerRequestId: deps.getFilePickerRequestId,
        renderFilePickerItems: deps.renderFilePickerItems,
        previewRequests: deps.previewRequests,
        showFilePreview: deps.showFilePreview,
        positionFilePreview: deps.positionFilePreview,
        showContextAttachPicker: deps.showContextAttachPicker,
        hideContextAttachPicker: deps.hideContextAttachPicker,
        insertLocalHistoryDivider: deps.insertLocalHistoryDivider
      }),
      ...createSimpleHandlers({
        updateTokenUsage: deps.updateTokenUsage,
        newChat: deps.newChat,
        clearChat: deps.clearChat,
        insertIntoInput: deps.insertIntoInput,
        renderSessionTabs: deps.renderSessionTabs,
        openLogModal: deps.openLogModal,
        renderAboutContent: deps.renderAboutContent,
        showModal: deps.showModal,
        aboutModal: deps.aboutModal,
        helpModal: deps.helpModal,
        faqModal: deps.faqModal
      })
    };
  }

  // media/src/bridge/message-bridge.js
  function initMessageBridge(handlers) {
    window.addEventListener("message", function(event) {
      const msg = event.data;
      const handler = handlers[msg.type];
      if (handler) handler(msg);
    });
  }

  // media/src/ui/global-events.js
  function bindGlobalEvents(deps) {
    window.addEventListener("scroll", function(e) {
      deps.hideContextAttachTooltip();
      if (deps.isContextAttachPreviewOpen() && deps.isInsideContextAttachPreview(e.target)) {
        return;
      }
      deps.hideContextAttachPreview();
    }, true);
    document.addEventListener("click", function(e) {
      if (!e.target.closest(".insert-dropdown")) {
        deps.closeInsertDropdowns();
      }
      if (tabContextMenu && !e.target.closest(".tab-context-menu")) {
        deps.hideTabContextMenu();
      }
      if (detectEnvDetailsOpen && !e.target.closest(".detect-env-bar")) {
        setDetectEnvDetailsOpen(false);
        const detectToggle = document.getElementById("detectEnvToggle");
        if (detectToggle) detectToggle.setAttribute("aria-expanded", "false");
      }
    });
    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && tabContextMenu && !tabContextMenu.hidden) {
        deps.hideTabContextMenu();
      }
      if (e.key === "Escape" && detectEnvDetailsOpen) {
        setDetectEnvDetailsOpen(false);
        const detectToggle = document.getElementById("detectEnvToggle");
        if (detectToggle) detectToggle.setAttribute("aria-expanded", "false");
      }
      if (e.key === "Escape" && configureEnvDetectDetailsOpen) {
        setConfigureEnvDetectDetailsOpen(false);
      }
      if (e.key === "Escape" && configureEnvModal && configureEnvModal.classList.contains("is-open")) {
        closeConfigureEnvModal();
      }
    });
    bindDetectToolbarEvents(deps.detectEnvBtn, document.getElementById("detectEnvClose"));
    bindConfigureEnvEvents();
    if (newChatBtn) {
      newChatBtn.addEventListener("click", function() {
        vscode.postMessage({ type: "newChat" });
      });
    }
  }

  // media/src/app/bootstrap/wire-app.js
  function wireApp(ctx) {
    bindGlobalEvents({
      detectEnvBtn: ctx.detectEnvBtn,
      closeInsertDropdowns: ctx.closeInsertDropdowns,
      hideTabContextMenu: ctx.hideTabContextMenu,
      hideContextAttachTooltip: () => ctx.contextAttach.hideContextAttachTooltip(),
      hideContextAttachPreview: () => ctx.contextAttach.hideContextAttachPreview(),
      isContextAttachPreviewOpen: () => ctx.contextAttach.isPreviewOpen(),
      isInsideContextAttachPreview: (target) => ctx.contextAttach.isInsideContextAttachPreview(target)
    });
    initMessageBridge(createAppHandlers({
      placeholder: ctx.getPlaceholder(),
      isMessageForActiveSession: ctx.session.isMessageForActiveSession,
      addMessage: ctx.addMessage,
      handleToolMessage: ctx.auxiliary.handleToolMessage,
      getThoughtMsgId: ctx.session.getThoughtMsgId,
      setThoughtMsgId: ctx.session.setThoughtMsgId,
      setAuxiliaryContent: ctx.auxiliary.setAuxiliaryContent,
      setAuxMessageLive: ctx.auxiliary.setAuxMessageLive,
      maybeScrollToBottom: ctx.maybeScrollToBottom,
      restoreHistory: ctx.restoreHistory,
      finalizeAssistantBubble: ctx.finalizeAssistantBubble,
      getIsPrompting: ctx.session.getIsPrompting,
      getAwaitingFirstChunk: ctx.session.getAwaitingFirstChunk,
      setInputMode: ctx.setInputMode,
      showPermissionRequest: ctx.showPermissionRequest,
      pendingPermissions: ctx.permissions.pendingPermissions,
      updatePermissionContent: ctx.updatePermissionContent,
      dismissPermissionRequest: ctx.dismissPermissionRequest,
      getLocale: ctx.getLocale,
      setConnectionAttempted: (v) => ctx.connection.setConnectionAttempted(v),
      updateStatus: ctx.connection.updateStatus,
      setIsPrompting: ctx.session.setIsPrompting,
      setAwaitingFirstChunk: ctx.session.setAwaitingFirstChunk,
      resetToolAggregation: ctx.auxiliary.resetToolAggregation,
      finishStreaming: ctx.finishStreaming,
      setCanSend: ctx.session.setCanSend,
      inputEl,
      scheduleSessionMarkdownRender: ctx.sessionRender.scheduleSessionMarkdownRender,
      maybeFocusInputAfterResponse: ctx.session.maybeFocusInputAfterResponse,
      resetAutoScrollFollow,
      updateTokenUsage: ctx.tokenUsage.updateTokenUsage,
      buildConnectionErrorPlaceholder: ctx.connection.buildConnectionErrorPlaceholder,
      bindConnectionErrorActions: ctx.connection.bindConnectionErrorActions,
      refreshLocale: () => {
        ctx.setLocale(getLocale());
        ctx.applyLocale();
      },
      getLastSessions: ctx.session.getLastSessions,
      getLastActiveSessionId: ctx.session.getLastActiveSessionId,
      renderSessionTabs: ctx.renderSessionTabs,
      renderProfileList: ctx.pickers.renderProfileList,
      renderModelList: ctx.pickers.renderModelList,
      appendLog: ctx.logViewer.appendLog,
      setPluginInfo: ctx.infoModals.setPluginInfo,
      renderAboutContent: ctx.infoModals.renderAboutContent,
      getFilePickerRequestId: () => ctx.fileRefs.getFilePickerRequestId(),
      renderFilePickerItems: ctx.fileRefs.renderFilePickerItems,
      previewRequests: ctx.fileRefs.previewRequests,
      showFilePreview: ctx.fileRefs.showFilePreview,
      positionFilePreview: ctx.fileRefs.positionFilePreview,
      showContextAttachPicker: ctx.contextAttach.showContextAttachPicker,
      hideContextAttachPicker: ctx.contextAttach.hideContextAttachPicker,
      insertLocalHistoryDivider: ctx.insertLocalHistoryDivider,
      newChat: ctx.newChat,
      clearChat: ctx.clearChat,
      insertIntoInput: ctx.insertIntoInput,
      openLogModal: ctx.logViewer.openLogModal,
      showModal,
      aboutModal: ctx.infoModals.aboutModal,
      helpModal: ctx.infoModals.helpModal,
      faqModal: ctx.infoModals.faqModal
    }));
  }

  // media/src/app/bootstrap.js
  function bootstrapApp(ctx) {
    const session2 = ctx.session;
    const getLocale2 = () => getLocale();
    const connection = createConnection({
      getLocale: getLocale2,
      getPlaceholder: ctx.getPlaceholder
    });
    connection.bindConnectionEvents();
    const groupBundle = createGroupUtilsBundle({ getLocale: getLocale2, session: session2 });
    const infoModals = createInfoModals({ getLocale: getLocale2 });
    infoModals.bindInfoModalEvents();
    const logViewer = createLogViewer({ getLocale: getLocale2 });
    logViewer.bindLogViewerEvents();
    const inputMode = createInputMode({ getCanSend: session2.getCanSend });
    const setInputMode = inputMode.setInputMode;
    const switchSession = createSwitchSessionModal({
      getLocale: getLocale2,
      getActiveSessionId: session2.getActiveSessionId,
      getIsPrompting: session2.getIsPrompting
    });
    switchSession.bindSwitchSessionEvents();
    const contentBlocksRef = {
      /** @type {(...args: unknown[]) => unknown} */
      setupContentBlocks: null
    };
    const graph = createMessageGraph({
      session: session2,
      getPlaceholder: ctx.getPlaceholder,
      getLocale: getLocale2,
      setInputMode,
      requestSessionExport: groupBundle.requestSessionExport,
      reindexSessionIndices: groupBundle.reindexSessionIndices,
      assignSessionIndex: groupBundle.assignSessionIndex,
      setupContentBlocks: (...a) => contentBlocksRef.setupContentBlocks(...a)
    });
    groupBundle.bindMessagesRef(graph.messages);
    const services = createAppServices({
      session: session2,
      getLocale: getLocale2,
      getPlaceholder: ctx.getPlaceholder,
      setPlaceholder: ctx.setPlaceholder,
      setInputMode,
      localeText,
      maybeScrollToBottom,
      requestSwitchSession: switchSession.requestSwitchSession,
      requestSessionExport: groupBundle.requestSessionExport,
      assignSessionIndex: groupBundle.assignSessionIndex,
      infoModals,
      ...graph
    });
    contentBlocksRef.setupContentBlocks = services.setupContentBlocks;
    wireApp({
      session: session2,
      getLocale: getLocale2,
      getPlaceholder: ctx.getPlaceholder,
      setLocale: ctx.setLocale,
      detectEnvBtn: ctx.detectEnvBtn,
      setInputMode,
      connection,
      infoModals,
      logViewer,
      maybeScrollToBottom,
      applyLocale: services.applyLocale,
      ...graph,
      ...services
    });
    return {
      applyLocale: services.applyLocale
    };
  }

  // media/src/chat-app.js
  var placeholder = document.getElementById("placeholder");
  var detectEnvBtn = document.getElementById("detectEnvBtn");
  initInputHeight();
  setupInputResize();
  bindInputHeightResizeListener();
  var session = createSessionState();
  session.initScrollBehavior();
  var { applyLocale } = bootstrapApp({
    session,
    getPlaceholder: () => placeholder,
    setPlaceholder: (el) => {
      placeholder = el;
    },
    detectEnvBtn,
    setLocale
  });
  applyLocale();
  vscode.postMessage({ type: "ready" });
})();
