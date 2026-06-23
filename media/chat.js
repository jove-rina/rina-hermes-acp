"use strict";
(() => {
  // media/src/chat-app.js
  var locale = window.__HERMES_LOCALE__ || {};
  var vscode = acquireVsCodeApi();
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
  var placeholder = document.getElementById("placeholder");
  var lastSessions = [];
  var lastActiveSessionId = "";
  var sessionMsgCounter = 0;
  var multiSelectMode = false;
  var multiSelectPurpose = "normal";
  var sessionRenderJobId = 0;
  var SESSION_RENDER_BANNER_ID = "sessionRenderBanner";
  var RESTORE_BATCH_SIZE = 30;
  var MARKDOWN_RENDER_BATCH_SIZE = 4;
  var LOCAL_HISTORY_DIVIDER_ID = "localHistoryDivider";
  function removeLocalHistoryDivider() {
    const divider = document.getElementById(LOCAL_HISTORY_DIVIDER_ID);
    if (divider) divider.remove();
  }
  function insertLocalHistoryDivider() {
    removeLocalHistoryDivider();
    const divider = document.createElement("div");
    divider.id = LOCAL_HISTORY_DIVIDER_ID;
    divider.className = "local-history-divider";
    divider.title = locale.localHistoryDividerTitle || "";
    divider.textContent = locale.localHistoryDivider || "";
    placeholder.style.display = "none";
    messagesEl.appendChild(divider);
  }
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
  var detectEnvDetailsOpen = false;
  var detectEnvPanelReady = false;
  var detectEnvFinished = false;
  function detectStepLabel(stepId) {
    const key = DETECT_STEP_LOCALE_KEYS[stepId];
    return key ? locale[key] || stepId : stepId;
  }
  function formatDetectStepDetail(msg) {
    if (msg.status === "running") return "\u2026";
    if (msg.status === "skip") return locale.detectEnvironmentStepSkipped || "Skipped";
    if (msg.step === "verify") {
      return localeText(
        "detectEnvironmentStepVerifyCount",
        msg.verifiedCount != null ? msg.verifiedCount : 0,
        msg.totalCount != null ? msg.totalCount : 0
      );
    }
    if (msg.step === "acp_check") {
      if (msg.status === "ok") return msg.detail || locale.detectEnvironmentStepAcpOk || "";
      if (msg.status === "fail") return msg.detail || locale.detectEnvironmentStepAcpFail || "";
    }
    if (msg.step === "acp_install") {
      if (msg.status === "ok") return msg.detail || locale.detectEnvironmentStepAcpInstallOk || "";
      if (msg.status === "fail") return msg.detail || locale.detectEnvironmentStepAcpInstallFail || "";
    }
    if (msg.step === "summary") {
      if (msg.detail) return msg.detail;
      if (msg.reportStatus === "ready") return locale.detectEnvironmentSummaryReady || "";
      if (msg.reportStatus === "broken") return locale.detectEnvironmentSummaryBroken || "";
      return locale.detectEnvironmentSummaryInstall || locale.detectEnvironmentSummaryNotFound || "";
    }
    if (msg.count > 0) {
      const summary = localeText("detectEnvironmentStepFoundCount", msg.count);
      if (msg.detail) return summary + "\n" + msg.detail;
      return summary;
    }
    if (msg.status === "fail" && msg.detail) return msg.detail;
    return locale.detectEnvironmentStepNotFound || "Not found";
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
  function setDetectEnvDetailsTitle() {
    const detailsTitle = document.getElementById("detectEnvDetailsTitle");
    if (!detailsTitle) return;
    detailsTitle.textContent = detectEnvFinished ? locale.detectEnvironmentCompleteTitle || locale.detectEnvironmentStepSummary || "" : locale.detectEnvironmentDetectTitle || locale.detectEnvironment || "";
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
      toggle.title = detectEnvDetailsOpen ? locale.detectEnvironmentHideDetails || "" : locale.detectEnvironmentViewDetails || "";
    }
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
  function hideDetectEnvironmentBar() {
    detectEnvFinished = false;
    setDetectEnvDetailsOpen(false);
    const bar = document.getElementById("detectEnvBar");
    if (bar) bar.hidden = true;
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
      toggle.title = locale.detectEnvironmentViewDetails || "";
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
      configureEnvDetectToggle.title = configureEnvDetectDetailsOpen ? locale.detectEnvironmentHideDetails || "" : locale.detectEnvironmentViewDetails || "";
    }
  }
  function setConfigureEnvDetectDetailsTitle() {
    if (!configureEnvDetectDetailsTitle) return;
    configureEnvDetectDetailsTitle.textContent = configureEnvDetectFinished ? locale.detectEnvironmentCompleteTitle || locale.detectEnvironmentStepSummary || "" : locale.detectEnvironmentDetectTitle || locale.detectEnvironment || "";
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
      "<code>" + escapeHtml(configureEnvSystemVar) + "</code>"
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
      configureEnvDetectToggle.title = locale.detectEnvironmentViewDetails || "";
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
  function basenameFromPath(filePath) {
    if (!filePath) return "hermes";
    const parts = filePath.split(/[/\\]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : "hermes";
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
      configureEnvCandidatesEmpty.textContent = locale.configureEnvironmentNoCandidates || "";
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
      badge.textContent = item.verified ? locale.detectEnvironmentCandidateVerified || "verified" : locale.detectEnvironmentCandidateUnverified || "unverified";
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
      openBtn.title = locale.configureEnvironmentOpenDirectory || "Open folder";
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
      selectBtn.setAttribute("aria-label", locale.configureEnvironmentSelectCandidate || "Select");
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
  function applyLocale() {
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
    updateModelButtonDisplay(lastModelPayload);
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
    const contextAttachSendYesBtn2 = document.getElementById("contextAttachSendYesBtn");
    const contextAttachSendNoBtn2 = document.getElementById("contextAttachSendNoBtn");
    if (contextAttachSendTitle) contextAttachSendTitle.textContent = locale.contextAttachCustom || "";
    if (contextAttachSendBody) contextAttachSendBody.textContent = locale.contextAttachSendPrompt || "";
    if (contextAttachSendYesBtn2) contextAttachSendYesBtn2.textContent = locale.contextAttachSendYes || "";
    if (contextAttachSendNoBtn2) contextAttachSendNoBtn2.textContent = locale.contextAttachSendNo || "";
    if (multiSelectAttachConfirmBtn) multiSelectAttachConfirmBtn.textContent = locale.contextAttachConfirm || "";
    updateContextAttachButtonLabel();
    renderContextAttachOptions();
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
    updateMultiSelectToolbar();
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
    const copyLogBtn2 = document.getElementById("copyLogBtn");
    if (copyLogBtn2) copyLogBtn2.textContent = locale.copy;
    const clearLogBtn = document.getElementById("clearLogBtn");
    if (clearLogBtn) clearLogBtn.textContent = locale.clear;
    const aboutModalTitle = document.getElementById("aboutModalTitle");
    if (aboutModalTitle) aboutModalTitle.textContent = locale.aboutTitle;
    const helpModalTitle = document.getElementById("helpModalTitle");
    if (helpModalTitle) helpModalTitle.textContent = locale.helpTitle;
    const helpModalBody = document.getElementById("helpModalBody");
    if (helpModalBody) helpModalBody.innerHTML = locale.helpHtml;
    const faqModalTitle = document.getElementById("faqModalTitle");
    if (faqModalTitle) faqModalTitle.textContent = locale.faqTitle;
    const faqModalBody2 = document.getElementById("faqModalBody");
    if (faqModalBody2) {
      faqModalBody2.innerHTML = locale.faqHtml || "";
      buildFaqAccordion(faqModalBody2);
    }
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
  (function initInputHeight() {
    let saved = INPUT_HEIGHT_DEFAULT;
    try {
      const raw = localStorage.getItem(INPUT_HEIGHT_STORAGE_KEY);
      if (raw) saved = parseInt(raw, 10);
    } catch (_) {
    }
    if (isNaN(saved)) saved = INPUT_HEIGHT_DEFAULT;
    setInputMaxHeight(saved, { persist: false, explicit: false });
  })();
  (function setupInputResize() {
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
  })();
  window.addEventListener("resize", syncInputHeightFromContent);
  window.addEventListener("scroll", function(e) {
    hideContextAttachTooltip();
    if (contextAttachPreviewOpen && isInsideContextAttachPreview(e.target)) {
      return;
    }
    hideContextAttachPreview();
  }, true);
  var streamingMessageId = null;
  var thoughtMsgId = null;
  var canSend = false;
  var isPrompting = false;
  var pendingSwitchSessionId = null;
  var contextAttachVisible = false;
  var contextAttachMode = "none";
  var contextAttachCustomIndices = [];
  var contextAttachCustomPending = false;
  var contextAttachCustomConfirmed = false;
  var contextAttachUnconfirmedIndices = [];
  var contextAttachPreviewOpen = false;
  var contextAttachPickerHiding = false;
  var contextAttachHasChoice = false;
  var pendingSendText = "";
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
    if (multiSelectPurpose === "contextAttach") {
      exitMultiSelectMode();
    }
    resetContextAttachPickerElement();
    closeAllDropdowns();
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
    if (multiSelectPurpose === "contextAttach") {
      exitMultiSelectMode();
    }
    resetContextAttachPickerElement();
    closeAllDropdowns();
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
    contextAttachTooltipEl.textContent = locale.contextAttachTooltip || contextAttachHelp.getAttribute("aria-label") || "";
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
      setGroupSelected(group, checkbox.checked);
    });
    selectWrap.appendChild(checkbox);
    group.insertBefore(selectWrap, group.firstChild);
    wireSelectableGroup(group);
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
    setGroupsSelected(updates);
  }
  function getCustomContextAttachSelectionCount() {
    if (contextAttachCustomConfirmed) {
      return contextAttachCustomIndices.length;
    }
    if (multiSelectMode && multiSelectPurpose === "contextAttach") {
      return getSelectedMessageIndices().length;
    }
    if (contextAttachCustomPending || contextAttachUnconfirmedIndices.length > 0) {
      return getUnconfirmedCustomSelectionIndices().length;
    }
    return 0;
  }
  function getContextAttachCountLabel(count) {
    return (locale.contextAttachSelected || "\u9644\u5E26\u4E0A\u8F6E\u5DF2\u9009{0}\u6761\u8BB0\u5FC6").replace("{0}", String(count));
  }
  function getContextAttachOptionLabel(mode) {
    switch (mode) {
      case "last2":
        return locale.contextAttachLast2;
      case "last10":
        return locale.contextAttachLast10;
      case "all":
        return locale.contextAttachAll;
      case "custom": {
        const count = getCustomContextAttachSelectionCount();
        if (count > 0) {
          return getContextAttachCountLabel(count);
        }
        if (contextAttachCustomPending || contextAttachCustomConfirmed || contextAttachHasChoice) {
          return locale.contextAttachCustomNone || "\u60A8\u6CA1\u6709\u9009\u62E9\u4EFB\u4F55\u8BB0\u5FC6";
        }
        return locale.contextAttachCustom;
      }
      case "none":
      default:
        if (contextAttachHasChoice) {
          return locale.contextAttachNone;
        }
        return locale.contextAttachPlaceholder || locale.contextAttachNone;
    }
  }
  function updateContextAttachButtonLabel() {
    if (!contextAttachLabel || !contextAttachBtn) {
      return;
    }
    const isPlaceholder = contextAttachMode === "none" && !contextAttachHasChoice;
    contextAttachLabel.textContent = getContextAttachOptionLabel(contextAttachMode);
    contextAttachBtn.classList.toggle("is-placeholder", isPlaceholder);
    contextAttachBtn.title = isPlaceholder ? locale.contextAttachPlaceholder || "" : getContextAttachOptionLabel(contextAttachMode);
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
      return locale.permissionTitle || "Permission";
    }
    if (group.classList.contains("thought")) {
      return locale.roleThought || "Thought";
    }
    if (group.classList.contains("tool")) {
      return locale.roleTool || "Tool";
    }
    return getGroupRoleLabel(group);
  }
  function getGroupPreviewText(group) {
    if (group.classList.contains("permission") && group._permissionState && group._permissionState.text) {
      return group._permissionState.text.trim();
    }
    if (group._auxState && group._auxState.rawText) {
      return group._auxState.rawText.trim();
    }
    return getMessagePlainText(group).trim();
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
      } else if (multiSelectMode && multiSelectPurpose === "contextAttach") {
        indices = getSelectedMessageIndices();
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
    const parts = [locale.contextAttachPrefixHeader || "", "---"];
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
    const template = locale.contextAttachPreviewTitle || "({0} / ~{1})";
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
      { mode: "none", label: locale.contextAttachNone },
      { mode: "last2", label: locale.contextAttachLast2 },
      { mode: "last10", label: locale.contextAttachLast10 },
      { mode: "all", label: locale.contextAttachAll },
      { mode: "custom", label: locale.contextAttachCustom }
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
        if (multiSelectPurpose === "contextAttach") {
          exitMultiSelectMode();
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
        closeAllDropdowns();
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
    closeAllDropdowns();
    ensureContextAttachSelectableTargets();
    enterMultiSelectMode(null, "contextAttach");
    applyContextAttachIndicesToSelection(previousIndices);
    updateContextAttachButtonLabel();
  }
  function confirmContextAttachSelection() {
    const indices = getSelectedMessageIndices();
    if (!indices.length) {
      return;
    }
    contextAttachCustomIndices = indices.slice();
    contextAttachUnconfirmedIndices = [];
    contextAttachMode = "custom";
    contextAttachCustomConfirmed = true;
    contextAttachCustomPending = false;
    contextAttachHasChoice = true;
    exitMultiSelectMode();
    updateContextAttachButtonLabel();
    renderContextAttachOptions();
  }
  function getUnconfirmedCustomSelectionIndices() {
    if (multiSelectMode && multiSelectPurpose === "contextAttach") {
      return getSelectedMessageIndices();
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
    if (multiSelectMode && multiSelectPurpose === "contextAttach") {
      exitMultiSelectMode();
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
  function executeSendMessage(text, attachOverride) {
    hideFilePicker();
    resetAutoScrollFollow();
    addMessage("user", text);
    inputEl.value = "";
    syncInputHeightFromContent();
    updateQuickActionBtns();
    inputEl.disabled = true;
    awaitingFirstChunk = true;
    setInputMode("waiting");
    const payload = attachOverride !== void 0 ? attachOverride : buildContextAttachPayload(false);
    vscode.postMessage({
      type: "sendMessage",
      text,
      contextAttach: payload
    });
  }
  function openSwitchSessionModal(sessionId) {
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
    if (!sessionId || sessionId === activeSessionId) {
      return;
    }
    if (isPrompting) {
      openSwitchSessionModal(sessionId);
      return;
    }
    vscode.postMessage({ type: "switchSession", sessionId });
  }
  var awaitingFirstChunk = false;
  window._showThoughts = true;
  window._showToolCalls = true;
  var SCROLL_BOTTOM_THRESHOLD = 24;
  var SCROLL_IDLE_MS = 5e3;
  var scrollPinnedByUser = false;
  var scrollIdleTimer = null;
  function isMessagesAtBottom() {
    if (!messagesEl) {
      return true;
    }
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight <= SCROLL_BOTTOM_THRESHOLD;
  }
  function isActivelyStreaming() {
    return !!(streamingMessageId || isPrompting);
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
      if (isActivelyStreaming()) {
        scrollPinnedByUser = false;
        maybeScrollToBottom(true);
      }
    }, SCROLL_IDLE_MS);
  }
  function onMessagesScroll() {
    if (!isActivelyStreaming()) {
      return;
    }
    if (!isMessagesAtBottom()) {
      scrollPinnedByUser = true;
    }
    scheduleScrollReenable();
  }
  if (messagesEl) {
    messagesEl.addEventListener("scroll", onMessagesScroll, { passive: true });
  }
  function resetAutoScrollFollow() {
    scrollPinnedByUser = false;
    if (scrollIdleTimer) {
      clearTimeout(scrollIdleTimer);
      scrollIdleTimer = null;
    }
  }
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
    const label = localeText("tokenUsageLabel", formatTokenCount(usedTokens), formatTokenCount(totalTokens), pct);
    tokenUsageRing.title = label;
    tokenUsageRing.setAttribute("aria-label", label);
    tokenUsageRing.hidden = false;
  }
  var toolCallMap = {};
  var toolAggregateGroupId = null;
  var TOOL_SHORT_MAX_LINES = 3;
  var TOOL_AGGREGATE_MAX_LINES = 12;
  var TOOL_AGGREGATE_SEPARATOR = "\n\n---\n\n";
  var pendingPermissions = /* @__PURE__ */ new Map();
  var PERM_COLLAPSED_LINES = 3;
  var PERM_LINE_HEIGHT_EM = 1.45;
  var THOUGHT_COLLAPSED_LINES = 5;
  var TOOL_COLLAPSED_LINES = 3;
  var AUX_LINE_HEIGHT_EM = 1.35;
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
    let firstText = state.rawText || "";
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
        maybeScrollToBottom();
      }
      return;
    }
    finalizeAssistantBubble();
    if (toolAggregateGroupId) {
      const group = document.getElementById(toolAggregateGroupId);
      if (group && group._auxState && canAggregateToolTexts(group._auxState.rawText || "", text)) {
        ensureAggregateEntries(group);
        group._auxState.aggregatedTools.push({ toolCallId, text });
        rebuildAggregateToolContent(group);
        toolCallMap[toolCallId] = toolAggregateGroupId;
        setAuxMessageLive(group, true);
        enableStopAfterAgentOutput();
        maybeScrollToBottom();
        return;
      }
    }
    const id = addMessage("tool", text);
    toolCallMap[toolCallId] = id;
    toolAggregateGroupId = id;
  }
  function setAuxiliaryContent(group, text) {
    const state = group._auxState;
    if (!state) return;
    state.rawText = text || "";
    state.contentEl.innerHTML = renderMarkdown(state.rawText);
    setupContentBlocks(state.contentEl);
    processFileRefs(state.contentEl);
    syncAuxiliaryDetailView(group);
  }
  function buildAuxiliaryMessage(role, text) {
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
  function finalizeAuxiliaryBubble(group) {
    if (!group || !group._auxState) return;
    setAuxiliaryContent(group, group._auxState.rawText);
  }
  function permissionBodyText(title, detail) {
    const parts = [];
    if (title) parts.push(String(title));
    if (detail && String(detail).trim()) parts.push(String(detail).trim());
    return parts.join("\n\n");
  }
  function permissionOptionLabel(opt) {
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
        statusText2 = localeText("permissionSelected", msg.selectedLabel || msg.selectedOptionId);
      } else if (msg.selectedLabel) {
        statusText2 = localeText("permissionSelected", msg.selectedLabel);
      }
      applyPermissionResolvedUI(group, statusText2);
    }
    assignSessionIndex(group);
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
  var connectionAttempted = false;
  var cancelBtn = document.getElementById("cancelBtn");
  var retryBtn = document.getElementById("retryBtn");
  var detectEnvBtn = document.getElementById("detectEnvBtn");
  var activeSessionId = "";
  var filePickerEl = document.getElementById("filePicker");
  var mentionStart = -1;
  var filePickerVisible = false;
  var filePickerItems = [];
  var filePickerIndex = 0;
  var fileListRequestId = 0;
  var fileListDebounce = null;
  var previewTooltip = null;
  var previewHideTimer = null;
  var previewRequestId = 0;
  var previewRequests = /* @__PURE__ */ new Map();
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
      sendBtn.disabled = !canSend;
    } else {
      cancelBtn.classList.add("hidden");
      sendBtn.classList.remove("hidden");
      sendBtn.disabled = true;
    }
  }
  function setQuickPanelOpen(open) {
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
  function updateConnectionActionVisibility(status) {
    const showActions = status === "error" || status === "idle" && connectionAttempted;
    if (retryBtn) {
      retryBtn.hidden = !showActions;
      retryBtn.disabled = status === "connecting";
    }
    if (detectEnvBtn) {
      detectEnvBtn.hidden = !showActions;
      detectEnvBtn.disabled = status === "connecting";
    }
  }
  function bindConnectionErrorActions() {
    const phRetry = document.getElementById("placeholderRetryBtn");
    if (phRetry) phRetry.addEventListener("click", doRetry);
    const phDetect = document.getElementById("placeholderDetectEnvBtn");
    if (phDetect) phDetect.addEventListener("click", doDetectEnvironment);
  }
  function buildConnectionErrorPlaceholder(errText) {
    if (placeholder) placeholder.className = "placeholder";
    return escapeHtml(errText) + '<div class="connection-error-actions" style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;justify-content:center"><button type="button" class="retry-btn" id="placeholderRetryBtn">' + escapeHtml(locale.retryConnect) + '</button><button type="button" class="retry-btn" id="placeholderDetectEnvBtn">' + escapeHtml(locale.detectEnvironment) + "</button></div>";
  }
  function updateRetryVisibility(status) {
    updateConnectionActionVisibility(status);
  }
  function doRetry() {
    if (retryBtn && retryBtn.disabled) return;
    connectionAttempted = true;
    vscode.postMessage({ type: "retry" });
  }
  function doDetectEnvironment() {
    if (detectEnvBtn && detectEnvBtn.disabled) return;
    vscode.postMessage({ type: "detectEnvironment" });
  }
  function updateStatus(status, message) {
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
    updateRetryVisibility(status);
  }
  var logs = [];
  var logFilterError = document.getElementById("logFilterError");
  var logFilterWarning = document.getElementById("logFilterWarning");
  var logModal = document.getElementById("logModal");
  var logContent = document.getElementById("logContent");
  var copyLogBtn = document.getElementById("copyLogBtn");
  var LOG_SCROLL_BOTTOM_THRESHOLD = 24;
  var LOG_SCROLL_IDLE_MS = 5e3;
  var logScrollPinnedByUser = false;
  var logScrollIdleTimer = null;
  var copyLogResetTimer = null;
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
  function showModal(el) {
    if (el) el.classList.add("is-open");
  }
  function hideModal(el) {
    if (el) el.classList.remove("is-open");
  }
  function openLogModal() {
    resetLogAutoScrollFollow();
    renderLogContent();
    showModal(logModal);
    maybeScrollLogToBottom(true);
  }
  document.getElementById("closeLogBtn").addEventListener("click", function() {
    hideModal(logModal);
  });
  if (copyLogBtn) {
    copyLogBtn.addEventListener("click", function() {
      const text = getVisibleLogText();
      if (!text) return;
      copyToClipboard(text).then(function() {
        copyLogBtn.classList.add("copied");
        const prevText = copyLogBtn.textContent;
        copyLogBtn.textContent = locale.copied;
        if (copyLogResetTimer) clearTimeout(copyLogResetTimer);
        copyLogResetTimer = setTimeout(function() {
          copyLogResetTimer = null;
          copyLogBtn.classList.remove("copied");
          copyLogBtn.textContent = prevText || locale.copy;
        }, 1500);
      });
    });
  }
  document.getElementById("clearLogBtn").addEventListener("click", function() {
    logs = [];
    renderLogContent();
  });
  if (logFilterError) logFilterError.addEventListener("change", renderLogContent);
  if (logFilterWarning) logFilterWarning.addEventListener("change", renderLogContent);
  if (logContent) {
    logContent.addEventListener("scroll", onLogContentScroll, { passive: true });
  }
  var COPY_ICON_SVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4 2h8a1 1 0 0 1 1 1v1h1a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1H4a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h0zm1 2v8h8V5H5zm-2 2h1v6h6v1H4a1 1 0 0 1-1-1V6h0z"/></svg>';
  var TAB_PIN_SVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M9.2 1.3 11.5 3.6V6l2.2 2.1v1.2H10v4.2L9 14H7L6 13.5V9.3H2.3V8.1L4.5 6V3.6L6.8 1.3h2.4zm-.9 1.4H7.7L5.9 4.5V6.4L4.3 8h7.4L10.1 6.4V4.5L8.3 2.7z"/></svg>';
  var SELECT_ICON_SVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M2 2.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2zm0 4.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5V7zm0 4.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2z"/><path d="M3.15 4.85l.7-.7 1 1 2-2 .7.7-2.7 2.7-1.7-1.7z"/><path d="M3.15 9.35l.7-.7 1 1 2-2 .7.7-2.7 2.7-1.7-1.7z"/><path d="M7.5 3h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1zm0 4.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1zm0 4.5h6a.5.5 0 0 1 0 1h-6a.5.5 0 0 1 0-1z"/></svg>';
  var CHEVRON_DOWN_SVG = '<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg"><path d="M4.5 6 8 9.5 11.5 6l.7.7L8 10.9l-4.2-4.2.7-.7z"/></svg>';
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
  function updateQuickActionBtns() {
    const hasMessages = messagesEl.querySelectorAll(".message-group").length > 0;
    const hasInput = !!inputEl.value.trim();
    if (clearChatBtn) clearChatBtn.disabled = !hasMessages;
    if (copySessionBtn) copySessionBtn.disabled = !hasMessages;
    if (clearInputBtn) clearInputBtn.disabled = !hasInput;
    if (chatSearchInput) chatSearchInput.disabled = !hasMessages;
    if (!hasMessages) clearChatSearch();
    else if (chatSearchInput && chatSearchInput.value.trim()) scheduleChatSearch();
  }
  var chatSearchState = {
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
    const hasQuery = !!chatSearchState.query;
    if (chatSearchCount) {
      if (!hasQuery) {
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
      const text = getMessagePlainText(group);
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
  function flashQuickActionBtn(btn, className, duration) {
    if (!btn) return;
    btn.classList.add(className || "copied");
    setTimeout(function() {
      btn.classList.remove(className || "copied");
    }, duration || 1500);
  }
  function isSelectableRole(role) {
    return role === "user" || role === "assistant" || role === "thought" || role === "tool";
  }
  function isGroupInContextAttachRegion(group) {
    const divider = document.getElementById(LOCAL_HISTORY_DIVIDER_ID);
    if (!divider) {
      return true;
    }
    return !!(group.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING);
  }
  function getSelectableGroups() {
    return Array.from(messagesEl.querySelectorAll(".message-group.selectable")).filter(function(group) {
      if (group.style.display === "none") {
        return false;
      }
      if (multiSelectPurpose === "contextAttach" && !isGroupInContextAttachRegion(group)) {
        return false;
      }
      if (multiSelectPurpose === "contextAttach" && !isAttachableMemoryGroup(group)) {
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
  function updateMultiSelectToolbar() {
    const selected = getSelectedGroups();
    const count = selected.length;
    const isAttachMode = multiSelectPurpose === "contextAttach";
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
      updateContextAttachButtonLabel();
    }
    hideContextAttachPreview();
  }
  function enterMultiSelectMode(initialGroup, purpose) {
    multiSelectPurpose = purpose || "normal";
    if (multiSelectMode) {
      if (initialGroup) {
        setGroupSelected(initialGroup, true);
      }
      updateMultiSelectToolbar();
      return;
    }
    multiSelectMode = true;
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
    if (!multiSelectMode) {
      return;
    }
    const wasAttachMode = multiSelectPurpose === "contextAttach";
    if (wasAttachMode && contextAttachCustomPending && !contextAttachCustomConfirmed) {
      const indices = getSelectedMessageIndices();
      if (indices.length > 0) {
        contextAttachUnconfirmedIndices = indices.slice();
        contextAttachMode = "custom";
      } else {
        contextAttachMode = "none";
        contextAttachCustomPending = false;
        contextAttachUnconfirmedIndices = [];
      }
    }
    multiSelectMode = false;
    multiSelectPurpose = "normal";
    messagesEl.classList.remove("multi-select-active");
    getSelectableGroups().forEach(function(group) {
      setGroupSelected(group, false);
    });
    clearContextAttachSelectableTargets();
    if (multiSelectToolbar) {
      multiSelectToolbar.hidden = true;
      multiSelectToolbar.classList.remove("visible");
    }
    updateMultiSelectToolbar();
    updateContextAttachButtonLabel();
  }
  function wireSelectableGroup(group) {
    if (group.dataset.selectWired) return;
    group.dataset.selectWired = "1";
    group.addEventListener("click", function(e) {
      if (!multiSelectMode) return;
      if (multiSelectPurpose === "contextAttach" && !isGroupInContextAttachRegion(group)) {
        return;
      }
      if (e.target.closest(".message-actions, .block-actions, .insert-dropdown, .insert-dropdown-menu, .msg-select-wrap")) {
        return;
      }
      e.preventDefault();
      toggleGroupSelection(group);
    });
  }
  function assignSessionIndex(group) {
    group.dataset.sessionIndex = String(sessionMsgCounter++);
  }
  function reindexSessionIndices() {
    sessionMsgCounter = 0;
    messagesEl.querySelectorAll(".message-group").forEach(function(group) {
      assignSessionIndex(group);
    });
  }
  function getGroupRoleLabel(group) {
    if (group.classList.contains("user")) return locale.roleYou;
    if (group.classList.contains("assistant")) return locale.roleHermes;
    if (group.classList.contains("thought")) return locale.roleThought;
    if (group.classList.contains("tool")) return locale.roleTool;
    return locale.roleMessage;
  }
  function showSessionRenderBanner() {
    if (!chatBodyEl) return;
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
      setupContentBlocks(target.el);
      processFileRefs(target.el);
      return;
    }
    if (target.kind === "aux") {
      setAuxiliaryContent(target.group, target.text);
    }
  }
  function scheduleSessionMarkdownRender() {
    const jobId = ++sessionRenderJobId;
    const targets = collectMarkdownRenderTargets();
    if (!targets.length) {
      hideSessionRenderBanner();
      window._hermesRendered = true;
      if (chatSearchState.query) scheduleChatSearch();
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
        if (chatSearchState.query) scheduleChatSearch();
      }
    }
    requestAnimationFrame(runBatch);
  }
  function getSelectedMessageIndices(groups) {
    return (groups || getSelectedGroups()).map(function(group) {
      return parseInt(group.dataset.sessionIndex || "", 10);
    }).filter(function(index) {
      return Number.isInteger(index) && index >= 0;
    });
  }
  function requestSessionExport(action, indices, sessionId) {
    const sid = sessionId || lastActiveSessionId;
    if (!sid) return;
    vscode.postMessage({
      type: "sessionExport",
      sessionId: sid,
      action,
      indices: indices && indices.length ? indices : void 0
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
    reindexSessionIndices();
    exitMultiSelectMode();
    updateQuickActionBtns();
    if (!messagesEl.querySelector(".message-group")) {
      placeholder.style.display = "block";
    }
  }
  function exportSelectedGroups() {
    const indices = getSelectedMessageIndices();
    if (!indices.length) return;
    requestSessionExport("export", indices);
  }
  function getMessagePlainText(group) {
    const bubble = group.querySelector(".message") || group;
    const content = bubble.querySelector(".content");
    if (content) return content.textContent || "";
    const aux = bubble.querySelector(".aux-body-content");
    if (aux) return aux.textContent || "";
    return "";
  }
  function attachMessageActions(group, inner) {
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
      enterMultiSelectMode(group);
    });
    actions.appendChild(selectBtn);
    inner.appendChild(actions);
  }
  function addMessage(role, text, options) {
    const restoring = options && options.restore;
    placeholder.style.display = "none";
    if (!restoring && role === "assistant" && streamingMessageId) {
      const last = document.getElementById(streamingMessageId);
      if (last) {
        last.querySelector(".content").textContent = text;
        last._rawText = text;
        if (chatSearchState.query) scheduleChatSearch();
        maybeScrollToBottom();
        return;
      }
    }
    const id = "msg-" + Date.now() + "-" + Math.random().toString(36).slice(2, 6);
    const group = document.createElement("div");
    group.className = "message-group " + role;
    group.id = id;
    if (isSelectableRole(role)) {
      group.classList.add("selectable");
      const selectWrap = document.createElement("label");
      selectWrap.className = "msg-select-wrap";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.addEventListener("click", function(e) {
        e.stopPropagation();
      });
      checkbox.addEventListener("change", function() {
        setGroupSelected(group, checkbox.checked);
      });
      selectWrap.appendChild(checkbox);
      group.appendChild(selectWrap);
      wireSelectableGroup(group);
    }
    assignSessionIndex(group);
    const inner = document.createElement("div");
    inner.className = "message-group-inner";
    let div;
    let auxParts = null;
    if (role === "tool" || role === "thought") {
      auxParts = buildAuxiliaryMessage(role, text);
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
        processFileRefs(content);
      }
    }
    if (role === "assistant" && !restoring) {
      resetToolAggregation();
      div.classList.add("streaming");
      streamingMessageId = id;
      clearAllToolLive();
      enableStopAfterAgentOutput();
    }
    if (role === "assistant") {
      group._rawText = text;
    }
    inner.appendChild(div);
    if (auxParts) {
      wireAuxiliaryMessage(group, auxParts, !!(restoring && options && options.deferMarkdown));
    }
    if (!restoring && role === "thought") {
      resetToolAggregation();
    }
    if (!restoring && (role === "thought" || role === "tool")) {
      enableStopAfterAgentOutput();
    }
    attachMessageActions(group, inner);
    group.appendChild(inner);
    messagesEl.appendChild(group);
    if (role === "thought" && !window._showThoughts) group.style.display = "none";
    if (role === "tool" && !window._showToolCalls) group.style.display = "none";
    updateQuickActionBtns();
    if (chatSearchState.query) scheduleChatSearch();
    maybeScrollToBottom();
    return id;
  }
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
  function finalizeAssistantBubble() {
    if (thoughtMsgId) {
      const thoughtGroup = document.getElementById(thoughtMsgId);
      setAuxMessageLive(thoughtGroup, false);
      finalizeAuxiliaryBubble(thoughtGroup);
      thoughtMsgId = null;
    }
    clearAllToolLive();
    if (streamingMessageId) {
      const group = document.getElementById(streamingMessageId);
      const el = group ? group.querySelector(".message") : null;
      if (el) {
        el.classList.remove("streaming");
        const text = el.querySelector(".content").textContent;
        if (group) group._rawText = text;
        el.querySelector(".content").innerHTML = renderMarkdown(text);
        setupContentBlocks(el.querySelector(".content"));
        processFileRefs(el.querySelector(".content"));
      }
      streamingMessageId = null;
    }
    if (chatSearchState.query) scheduleChatSearch();
  }
  function enableStopAfterAgentOutput() {
    if (!awaitingFirstChunk) {
      return;
    }
    awaitingFirstChunk = false;
    if (isPrompting) {
      setInputMode("stop");
    }
  }
  function finishStreaming() {
    finalizeAssistantBubble();
    if (isPrompting && awaitingFirstChunk) {
      setInputMode("waiting");
    } else {
      setInputMode(isPrompting ? "stop" : canSend ? "send" : "disabled");
    }
  }
  function appendToInput(text) {
    if (!text) return;
    hideFilePicker();
    const val = inputEl.value;
    const needsSep = val.length > 0 && !/\n$/.test(val);
    inputEl.value = val + (needsSep ? "\n" : "") + text;
    if (!inputEl.disabled) {
      const pos = inputEl.value.length;
      inputEl.setSelectionRange(pos, pos);
      syncInputHeightFromContent();
      updateQuickActionBtns();
      inputEl.focus();
    }
  }
  function insertIntoInput(text) {
    if (!text) return;
    hideFilePicker();
    const val = inputEl.value;
    const start = typeof inputEl.selectionStart === "number" ? inputEl.selectionStart : val.length;
    const end = typeof inputEl.selectionEnd === "number" ? inputEl.selectionEnd : start;
    inputEl.value = val.slice(0, start) + text + val.slice(end);
    if (!inputEl.disabled) {
      const pos = start + text.length;
      inputEl.setSelectionRange(pos, pos);
      syncInputHeightFromContent();
      updateQuickActionBtns();
      inputEl.focus();
    }
  }
  function insertToEditor(text) {
    if (!text) return;
    vscode.postMessage({ type: "insertEditor", text });
  }
  function closeInsertDropdowns(except) {
    document.querySelectorAll(".insert-dropdown.is-open").forEach(function(dropdown) {
      if (except && dropdown === except) return;
      dropdown.classList.remove("is-open");
    });
  }
  function createInsertDropdown(getText) {
    const dropdown = document.createElement("div");
    dropdown.className = "insert-dropdown";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "block-btn insert-toggle";
    toggle.innerHTML = escapeHtml(locale.insertMenu || locale.insert) + CHEVRON_DOWN_SVG;
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
      appendToInput(getText());
    });
    const editorBtn = document.createElement("button");
    editorBtn.type = "button";
    editorBtn.textContent = locale.insertToEditor;
    editorBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      closeInsertDropdowns();
      insertToEditor(getText());
    });
    menu.appendChild(inputBtn);
    menu.appendChild(editorBtn);
    dropdown.appendChild(toggle);
    dropdown.appendChild(menu);
    return dropdown;
  }
  function addBlockActions(container, getText) {
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
    filePickerVisible = false;
    mentionStart = -1;
    filePickerItems = [];
    filePickerIndex = 0;
    filePickerEl.classList.remove("visible");
    filePickerEl.innerHTML = "";
  }
  function renderFilePickerItems(files) {
    filePickerItems = files || [];
    filePickerIndex = 0;
    filePickerEl.innerHTML = "";
    if (filePickerItems.length === 0) {
      const empty = document.createElement("div");
      empty.className = "file-picker-empty";
      empty.textContent = locale.noMatchingFiles;
      filePickerEl.appendChild(empty);
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
        filePickerEl.appendChild(btn);
      });
    }
    filePickerEl.classList.add("visible");
    filePickerVisible = true;
  }
  function updateFilePickerHighlight() {
    filePickerEl.querySelectorAll(".file-picker-item").forEach(function(el, idx) {
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
    syncInputHeightFromContent();
    hideFilePicker();
    inputEl.focus();
  }
  function detectFileMention() {
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
      filePickerEl.dataset.requestId = reqId;
      filePickerEl.innerHTML = '<div class="file-picker-empty">' + escapeHtml(locale.searchingFiles) + "</div>";
      filePickerEl.classList.add("visible");
      filePickerVisible = true;
      vscode.postMessage({ type: "listFiles", query, requestId: reqId });
    }, 120);
  }
  function resetChatView() {
    cancelSessionMarkdownRender();
    clearChatSearch();
    exitMultiSelectMode();
    removeLocalHistoryDivider();
    forceHideContextAttachPicker();
    messagesEl.innerHTML = '<div class="placeholder" id="placeholder">' + escapeHtml(locale.readyPlaceholder) + "</div>";
    placeholder = document.getElementById("placeholder");
    streamingMessageId = null;
    thoughtMsgId = null;
    toolCallMap = {};
    sessionMsgCounter = 0;
    resetToolAggregation();
    pendingPermissions.clear();
    window._hermesRendered = false;
    updateQuickActionBtns();
    updateTokenUsage(0, 0);
    setInputMode(canSend ? "send" : "disabled");
  }
  function newChat() {
    resetChatView();
  }
  function clearChat() {
    resetChatView();
  }
  function restoreHistory(messages, localHistoryOnly) {
    cancelSessionMarkdownRender();
    streamingMessageId = null;
    thoughtMsgId = null;
    toolCallMap = {};
    sessionMsgCounter = 0;
    resetToolAggregation();
    pendingPermissions.clear();
    window._hermesRendered = false;
    exitMultiSelectMode();
    if (!messages || messages.length === 0) {
      removeLocalHistoryDivider();
      return;
    }
    placeholder.style.display = "none";
    let cursor = 0;
    function appendRestoreBatch() {
      const end = Math.min(cursor + RESTORE_BATCH_SIZE, messages.length);
      for (; cursor < end; cursor++) {
        const m = messages[cursor];
        if (m.role === "permission") {
          restorePermissionMessage(m);
        } else {
          addMessage(m.role, m.text, { restore: true, deferMarkdown: true });
        }
      }
      if (cursor < messages.length) {
        requestAnimationFrame(appendRestoreBatch);
        return;
      }
      updateQuickActionBtns();
      if (localHistoryOnly) {
        insertLocalHistoryDivider();
      } else {
        removeLocalHistoryDivider();
      }
      scheduleSessionMarkdownRender();
    }
    requestAnimationFrame(appendRestoreBatch);
  }
  function sendMessage() {
    const text = inputEl.value.trim();
    if (!text || !canSend) return;
    if (hasUnconfirmedCustomMemorySelection()) {
      openContextAttachSendModal(text);
      return;
    }
    executeSendMessage(text);
  }
  inputEl.addEventListener("input", function() {
    syncInputHeightFromContent();
    detectFileMention();
    updateQuickActionBtns();
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
      return;
    }
    if (e.key === "Escape" && multiSelectMode) {
      e.preventDefault();
      exitMultiSelectMode();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendBtn.addEventListener("click", sendMessage);
  if (quickToggleBtn) {
    quickToggleBtn.addEventListener("click", toggleQuickPanel);
  }
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
  if (clearChatBtn) {
    clearChatBtn.addEventListener("click", function() {
      if (clearChatBtn.disabled) return;
      vscode.postMessage({ type: "clearChat" });
    });
  }
  if (multiSelectAllBtn) {
    multiSelectAllBtn.addEventListener("click", function() {
      if (!multiSelectMode) {
        enterMultiSelectMode(null, multiSelectPurpose);
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
      requestSessionExport("copy", indices);
    });
  }
  if (multiSelectExportBtn) {
    multiSelectExportBtn.addEventListener("click", function() {
      if (multiSelectExportBtn.disabled) return;
      exportSelectedGroups();
    });
  }
  if (multiSelectExitBtn) {
    multiSelectExitBtn.addEventListener("click", exitMultiSelectMode);
  }
  if (multiSelectAttachConfirmBtn) {
    multiSelectAttachConfirmBtn.addEventListener("click", function() {
      if (multiSelectAttachConfirmBtn.disabled) {
        return;
      }
      confirmContextAttachSelection();
    });
  }
  document.addEventListener("click", function(e) {
    if (!e.target.closest(".insert-dropdown")) {
      closeInsertDropdowns();
    }
    if (tabContextMenu && !e.target.closest(".tab-context-menu")) {
      hideTabContextMenu();
    }
    if (detectEnvDetailsOpen && !e.target.closest(".detect-env-bar")) {
      setDetectEnvDetailsOpen(false);
      const detectToggle = document.getElementById("detectEnvToggle");
      if (detectToggle) detectToggle.setAttribute("aria-expanded", "false");
    }
  });
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" && tabContextMenu && !tabContextMenu.hidden) {
      hideTabContextMenu();
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
  var detectEnvToggle = document.getElementById("detectEnvToggle");
  if (detectEnvToggle) {
    detectEnvToggle.addEventListener("click", function(e) {
      e.stopPropagation();
      setDetectEnvDetailsOpen(!detectEnvDetailsOpen);
      detectEnvToggle.setAttribute("aria-expanded", detectEnvDetailsOpen ? "true" : "false");
    });
  }
  var detectEnvCloseBtn = document.getElementById("detectEnvClose");
  if (detectEnvCloseBtn) {
    detectEnvCloseBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      hideDetectEnvironmentBar();
      vscode.postMessage({ type: "detectEnvironmentDismiss" });
    });
  }
  if (clearInputBtn) {
    clearInputBtn.addEventListener("click", function() {
      if (clearInputBtn.disabled) return;
      inputEl.value = "";
      syncInputHeightFromContent();
      updateQuickActionBtns();
      inputEl.focus();
    });
  }
  if (copySessionBtn) {
    copySessionBtn.addEventListener("click", function() {
      if (copySessionBtn.disabled) return;
      requestSessionExport("copy");
      flashQuickActionBtn(copySessionBtn);
    });
  }
  cancelBtn.addEventListener("click", function() {
    vscode.postMessage({ type: "cancel" });
  });
  if (retryBtn) {
    retryBtn.addEventListener("click", doRetry);
  }
  if (detectEnvBtn) {
    detectEnvBtn.addEventListener("click", doDetectEnvironment);
  }
  if (configureEnvBrowseBtn) {
    configureEnvBrowseBtn.addEventListener("click", browseConfigureEnvPath);
  }
  if (configureEnvDetectBtn) {
    configureEnvDetectBtn.addEventListener("click", startConfigureEnvDetect);
  }
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
  if (configureEnvSaveBtn) {
    configureEnvSaveBtn.addEventListener("click", saveConfigureEnvPath);
  }
  if (configureEnvCancelBtn) {
    configureEnvCancelBtn.addEventListener("click", closeConfigureEnvModal);
  }
  if (configureEnvCloseBtn) {
    configureEnvCloseBtn.addEventListener("click", closeConfigureEnvModal);
  }
  if (configureEnvSystemBtn) {
    configureEnvSystemBtn.addEventListener("click", requestConfigureEnvSystemPath);
  }
  if (configureEnvModal) {
    configureEnvModal.addEventListener("click", function(e) {
      if (e.target === configureEnvModal) {
        closeConfigureEnvModal();
      }
    });
  }
  newChatBtn.addEventListener("click", function() {
    vscode.postMessage({ type: "newChat" });
  });
  var aboutModal = document.getElementById("aboutModal");
  var helpModal = document.getElementById("helpModal");
  var faqModal = document.getElementById("faqModal");
  var faqModalBody = document.getElementById("faqModalBody");
  var aboutContent = document.getElementById("aboutContent");
  var pluginInfo = {};
  function renderAboutContent() {
    const name = pluginInfo.displayName || "Rina Hermes ACP";
    const version = pluginInfo.version || "\u2014";
    const publisher = pluginInfo.publisher || "";
    const repo = pluginInfo.repository || "";
    const iconUri = pluginInfo.iconUri || "";
    const logoHtml = iconUri ? '<div class="about-brand"><img src="' + escapeHtml(iconUri) + '" alt="' + escapeHtml(name) + '" /></div>' : "";
    aboutContent.innerHTML = logoHtml + "<h3>" + escapeHtml(name) + "</h3><p>" + locale.aboutVersion + " <code>" + escapeHtml(version) + "</code>" + (publisher ? " \xB7 " + escapeHtml(publisher) : "") + "</p><p>" + locale.aboutDescription + "</p><ul><li>" + escapeHtml(locale.aboutFeatureTabs) + "</li><li>" + escapeHtml(locale.aboutFeaturePickers) + "</li><li>" + escapeHtml(locale.aboutFeatureInsert) + "</li><li>" + escapeHtml(locale.aboutFeatureTools) + "</li></ul>" + (repo ? '<p class="dim">' + escapeHtml(locale.repository) + '\uFF1A<a href="#" data-url="' + escapeHtml(repo) + '">' + escapeHtml(repo) + "</a></p>" : "");
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
  var tabBar = document.getElementById("tab-bar");
  var tabContextMenu = document.getElementById("tabContextMenu");
  var tabContextSessionId = null;
  var profilePicker = document.getElementById("profilePicker");
  var profileBtn = document.getElementById("profileBtn");
  var profileDropdown = document.getElementById("profileDropdown");
  var modelPicker = document.getElementById("modelPicker");
  var modelBtn = document.getElementById("modelBtn");
  var modelLabelEl = document.getElementById("modelLabel");
  var modelDropdown = document.getElementById("modelDropdown");
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
  var switchSessionModal = document.getElementById("switchSessionModal");
  function closeAllDropdowns() {
    profilePicker.classList.remove("is-open");
    modelPicker.classList.remove("is-open");
    if (contextAttachPicker) contextAttachPicker.classList.remove("is-open");
    profileDropdown.style.display = "none";
    modelDropdown.style.display = "none";
    if (contextAttachDropdown) contextAttachDropdown.style.display = "none";
    hideContextAttachTooltip();
    hideContextAttachPreview();
  }
  document.addEventListener("click", function(e) {
    if (e.target.closest(".picker")) {
      return;
    }
    if (e.target.closest("#contextAttachPreview")) {
      return;
    }
    if (!e.target.closest("#input-area")) {
      hideFilePicker();
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
  if (contextAttachBtn && contextAttachDropdown) {
    contextAttachBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      const open = contextAttachDropdown.style.display === "none";
      closeAllDropdowns();
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
  var switchSessionStayBtn = document.getElementById("switchSessionStayBtn");
  var switchSessionConfirmBtn = document.getElementById("switchSessionConfirmBtn");
  if (switchSessionStayBtn) {
    switchSessionStayBtn.addEventListener("click", closeSwitchSessionModal);
  }
  if (switchSessionConfirmBtn) {
    switchSessionConfirmBtn.addEventListener("click", function() {
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
  bindContextAttachTooltip();
  bindContextAttachPreview();
  var contextAttachSendYesBtn = document.getElementById("contextAttachSendYesBtn");
  var contextAttachSendNoBtn = document.getElementById("contextAttachSendNoBtn");
  if (contextAttachSendYesBtn) {
    contextAttachSendYesBtn.addEventListener("click", function() {
      const text = pendingSendText;
      if (!text) {
        closeContextAttachSendModal();
        return;
      }
      finalizeContextAttachSelectionFromPending();
      closeContextAttachSendModal();
      executeSendMessage(text, buildContextAttachPayload(false));
    });
  }
  if (contextAttachSendNoBtn) {
    contextAttachSendNoBtn.addEventListener("click", function() {
      const text = pendingSendText;
      if (!text) {
        closeContextAttachSendModal();
        return;
      }
      contextAttachUnconfirmedIndices = [];
      contextAttachCustomPending = false;
      if (contextAttachMode === "custom" && !contextAttachCustomConfirmed) {
        contextAttachMode = "none";
      }
      closeContextAttachSendModal();
      executeSendMessage(text, buildContextAttachPayload(true));
    });
  }
  if (contextAttachSendModal) {
    contextAttachSendModal.addEventListener("click", function(e) {
      if (e.target === contextAttachSendModal) {
        closeContextAttachSendModal();
      }
    });
  }
  function renderProfileList(profiles) {
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
      list.innerHTML = '<div class="dropdown-item disabled">' + escapeHtml(locale.configureAgents) + "</div>";
      return;
    }
    list.innerHTML = entries.map(function(entry) {
      const active = entry.label === current ? " active" : "";
      return '<div class="dropdown-item' + active + '" data-profile="' + escapeHtml(entry.id) + '">' + escapeHtml(entry.label) + (active ? " \u2713" : "") + "</div>";
    }).join("");
    list.querySelectorAll(".dropdown-item[data-profile]").forEach(function(item) {
      item.addEventListener("click", function() {
        vscode.postMessage({ type: "switchAgent", agentName: this.dataset.profile });
        closeAllDropdowns();
      });
    });
  }
  var modelConfigId = "";
  var lastModelPayload = null;
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
    const list = document.getElementById("modelList");
    lastModelPayload = payload;
    modelConfigId = payload.configId || "";
    updateModelButtonDisplay(payload);
    const groups = Array.isArray(payload.groups) ? payload.groups.filter(function(g) {
      return g && Array.isArray(g.models) && g.models.length > 0;
    }) : [];
    const models = payload.models || [];
    if (!models.length) {
      list.innerHTML = '<div class="dropdown-item disabled">' + escapeHtml(locale.noModels) + "</div>";
      return;
    }
    if (groups.length > 1) {
      list.innerHTML = groups.map(function(group) {
        const header = '<div class="dropdown-group-label">' + escapeHtml(group.name || group.slug || "") + "</div>";
        const items = group.models.map(function(m) {
          const active = m.valueId === payload.currentValueId;
          return '<div class="dropdown-item' + (active ? " active" : "") + '" data-value="' + escapeHtml(m.valueId) + '">' + escapeHtml(m.name) + (active ? " \u2713" : "") + "</div>";
        }).join("");
        return header + items;
      }).join("");
    } else {
      list.innerHTML = models.map(function(m) {
        const active = m.valueId === payload.currentValueId;
        return '<div class="dropdown-item' + (active ? " active" : "") + '" data-value="' + escapeHtml(m.valueId) + '">' + escapeHtml(m.name) + (active ? " \u2713" : "") + "</div>";
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
  function escapeHtml(s) {
    return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  var editingSessionId = null;
  function startTabRename(tab, sessionId) {
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
  function reorderSessionTabs(fromId, toId) {
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
    lastSessions = ids.map(function(id) {
      return byId[id];
    }).filter(Boolean);
    renderSessionTabs(lastSessions, lastActiveSessionId);
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
  function downloadSessionMarkdown(markdown, filename) {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "chat-export.md";
    link.click();
    URL.revokeObjectURL(url);
  }
  function showTabContextMenu(sessionId, clientX, clientY) {
    const session = lastSessions.find(function(s) {
      return s.id === sessionId;
    });
    if (!session || !tabContextMenu) {
      return;
    }
    tabContextSessionId = sessionId;
    const idx = lastSessions.findIndex(function(s) {
      return s.id === sessionId;
    });
    const canCloseLeft = idx > 0;
    const canCloseRight = idx >= 0 && idx < lastSessions.length - 1;
    const canCloseOthers = lastSessions.length > 1;
    const pinLabel = session.pinned ? locale.tabContextUnpin : locale.tabContextPin;
    tabContextMenu.innerHTML = '<div class="tab-ctx-sid"><span class="tab-ctx-sid-label">' + escapeHtml(locale.tabContextSid) + ':</span><span class="tab-ctx-sid-value" title="' + escapeHtml(sessionId) + '">' + escapeHtml(sessionId) + '</span><button type="button" class="tab-ctx-sid-copy" data-action="copySid" title="' + escapeHtml(locale.copySid) + '">' + COPY_ICON_SVG + '</button></div><button type="button" class="tab-ctx-item" data-action="export">' + escapeHtml(locale.tabContextExport) + '</button><button type="button" class="tab-ctx-item" data-action="copy">' + escapeHtml(locale.tabContextCopy) + '</button><div class="tab-ctx-divider"></div><button type="button" class="tab-ctx-item" data-action="rename">' + escapeHtml(locale.tabContextRename) + '</button><button type="button" class="tab-ctx-item" data-action="close">' + escapeHtml(locale.tabContextClose) + '</button><button type="button" class="tab-ctx-item" data-action="closeOthers"' + (canCloseOthers ? "" : " disabled") + ">" + escapeHtml(locale.tabContextCloseOthers) + '</button><button type="button" class="tab-ctx-item" data-action="closeLeft"' + (canCloseLeft ? "" : " disabled") + ">" + escapeHtml(locale.tabContextCloseLeft) + '</button><button type="button" class="tab-ctx-item" data-action="closeRight"' + (canCloseRight ? "" : " disabled") + ">" + escapeHtml(locale.tabContextCloseRight) + '</button><button type="button" class="tab-ctx-item" data-action="closeAll">' + escapeHtml(locale.tabContextCloseAll) + '</button><div class="tab-ctx-divider"></div><button type="button" class="tab-ctx-item" data-action="togglePin">' + escapeHtml(pinLabel) + "</button>";
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
          requestSessionExport("export", void 0, targetId);
        } else if (action === "copy") {
          requestSessionExport("copy", void 0, targetId);
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
  function renderSessionTabs(sessions, activeId) {
    activeSessionId = activeId || activeSessionId;
    lastSessions = sessions || [];
    lastActiveSessionId = activeSessionId;
    if (editingSessionId) {
      return;
    }
    if (!sessions || sessions.length === 0) {
      tabBar.innerHTML = "";
      return;
    }
    const parts = [];
    sessions.forEach(function(s, index) {
      const active = s.id === activeSessionId ? " active" : "";
      const pinnedClass = s.pinned ? " pinned" : "";
      const title = escapeHtml(s.title || locale.newChat);
      const pinIcon = s.pinned ? '<span class="tab-pin-icon" title="' + escapeHtml(locale.tabContextPin) + '">' + TAB_PIN_SVG + "</span>" : "";
      parts.push('<div class="session-tab' + active + pinnedClass + '" data-id="' + escapeHtml(s.id) + '" title="' + title + '">' + pinIcon + '<span class="tab-title">' + title + '</span><span class="tab-close" data-id="' + escapeHtml(s.id) + '" title="' + escapeHtml(locale.tabClose) + '">\xD7</span></div>');
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
        if (tab.dataset.id !== activeSessionId) {
          requestSwitchSession(tab.dataset.id);
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
  function showPermissionRequest(msg) {
    finalizeAssistantBubble();
    placeholder.style.display = "none";
    enableStopAfterAgentOutput();
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
    maybeScrollToBottom();
  }
  function resolvePermission(id, optionId, selectedLabel) {
    const group = pendingPermissions.get(id);
    if (!group) {
      return;
    }
    pendingPermissions.delete(id);
    applyPermissionResolvedUI(group, localeText("permissionSelected", selectedLabel || optionId));
    vscode.postMessage({ type: "permissionResponse", id, optionId });
  }
  function dismissPermissionRequest(id, statusText2) {
    const group = pendingPermissions.get(id);
    if (!group) {
      return;
    }
    pendingPermissions.delete(id);
    applyPermissionResolvedUI(group, statusText2 || locale.permissionCancelled || "Cancelled");
  }
  function isMessageForActiveSession(msg) {
    return !msg.sessionId || msg.sessionId === lastActiveSessionId;
  }
  window.addEventListener("message", function(event) {
    const msg = event.data;
    switch (msg.type) {
      case "addMessage":
        if (!isMessageForActiveSession(msg)) {
          break;
        }
        if (msg.role === "assistant") {
          addMessage("assistant", msg.text);
        } else if (msg.role === "tool" && msg.toolCallId) {
          handleToolMessage(msg.text, msg.toolCallId);
        } else if (msg.role === "thought") {
          if (thoughtMsgId) {
            const el = document.getElementById(thoughtMsgId);
            if (el) {
              setAuxiliaryContent(el, msg.text);
              setAuxMessageLive(el, true);
              maybeScrollToBottom();
              break;
            }
          }
          const id = addMessage("thought", msg.text);
          thoughtMsgId = id;
        } else {
          addMessage(msg.role, msg.text);
        }
        break;
      case "status":
        if (!isMessageForActiveSession(msg)) {
          break;
        }
        if (msg.status === "connecting") {
          connectionAttempted = true;
        }
        updateStatus(msg.status, msg.message);
        if (msg.status === "ready") {
          isPrompting = false;
          awaitingFirstChunk = false;
          resetToolAggregation();
          finishStreaming();
          canSend = true;
          inputEl.disabled = false;
          setInputMode("send");
          placeholder.style.display = "none";
          if (!window._hermesRendered) {
            scheduleSessionMarkdownRender();
          }
          maybeFocusInputAfterResponse();
        } else if (msg.status === "prompting") {
          isPrompting = true;
          resetAutoScrollFollow();
          canSend = false;
          inputEl.disabled = true;
          if (!awaitingFirstChunk) {
            setInputMode("stop");
          }
        } else if (msg.status === "error") {
          isPrompting = false;
          awaitingFirstChunk = false;
          canSend = false;
          inputEl.disabled = true;
          finishStreaming();
          setInputMode("disabled");
          updateTokenUsage(0, 0);
          const errText = msg.message || locale.connectionError;
          placeholder.innerHTML = buildConnectionErrorPlaceholder(errText);
          bindConnectionErrorActions();
          placeholder.style.display = "block";
        } else if (msg.status === "idle") {
          isPrompting = false;
          awaitingFirstChunk = false;
          canSend = false;
          inputEl.disabled = true;
          finishStreaming();
          setInputMode("disabled");
          updateTokenUsage(0, 0);
        }
        break;
      case "tokenUsage":
        updateTokenUsage(msg.used, msg.size);
        break;
      case "newChat":
        newChat();
        break;
      case "clearChat":
        clearChat();
        break;
      case "insertInput":
        insertIntoInput(msg.text || "");
        break;
      case "restoreHistory":
        restoreHistory(msg.messages, msg.localHistoryOnly);
        break;
      case "detectEnvironmentStart":
        initDetectEnvironmentStart(msg.mode || "manual");
        if (placeholder) placeholder.style.display = "none";
        break;
      case "detectEnvironmentProgress":
        updateDetectEnvironmentStep(msg);
        break;
      case "detectEnvironmentEnd":
        finishDetectEnvironmentPanel(msg);
        break;
      case "configureEnvironmentOpen":
        openConfigureEnvModal(msg.currentPath || "", msg.systemEnvVar, msg.systemEnvTarget);
        break;
      case "configureEnvironmentDetectStart":
        setConfigureEnvDetecting(true);
        break;
      case "configureEnvironmentDetectProgress":
        updateConfigureEnvDetectProgress(msg);
        break;
      case "configureEnvironmentDetectEnd":
        finishConfigureEnvDetect(msg);
        break;
      case "configureEnvironmentDetectClosed":
        hideConfigureEnvDetectProgress();
        setConfigureEnvDetecting(false);
        break;
      case "configureEnvironmentBrowseResult":
        if (msg.path && configureEnvPathInput) {
          configureEnvPathInput.value = msg.path;
          configureEnvSelectedPath = msg.path;
          updateConfigureEnvPathClearVisibility();
        } else if (msg.error && configureEnvDetectCompactText) {
          showConfigureEnvDetectPanel();
          configureEnvDetectCompactText.textContent = msg.error;
          setDetectEnvIcon(configureEnvDetectCompactIcon, "fail");
        }
        break;
      case "configureEnvironmentSaveResult":
        if (msg.ok) {
          closeConfigureEnvModal();
        } else if (msg.error && configureEnvDetectCompactText) {
          showConfigureEnvDetectPanel();
          configureEnvDetectCompactText.textContent = msg.error;
          setDetectEnvIcon(configureEnvDetectCompactIcon, "fail");
        }
        break;
      case "setLocale":
        if (msg.locale) {
          locale = msg.locale;
          applyLocale();
          if (lastSessions.length > 0) {
            renderSessionTabs(lastSessions, lastActiveSessionId);
          }
          const divider = document.getElementById(LOCAL_HISTORY_DIVIDER_ID);
          if (divider) {
            divider.textContent = locale.localHistoryDivider || "";
            divider.title = locale.localHistoryDividerTitle || "";
          }
        }
        break;
      case "sessionList":
        renderSessionTabs(msg.sessions, msg.activeSessionId);
        break;
      case "sessionExport":
        if (msg.action === "copy" && msg.markdown) {
          copyToClipboard(msg.markdown);
        } else if (msg.action === "export" && msg.markdown) {
          downloadSessionMarkdown(msg.markdown, msg.filename);
        }
        break;
      case "agentList":
      case "profileList":
        renderProfileList(msg.agents || msg.profiles);
        break;
      case "modelList":
        renderModelList(msg);
        break;
      case "log":
        if (msg.level === "error" || msg.level === "warning") {
          logs.push({ line: msg.line, level: msg.level });
          if (logs.length > 500) logs = logs.slice(-500);
          if (isLogModalOpen()) {
            renderLogContent();
          }
        }
        break;
      case "openLogs":
        openLogModal();
        break;
      case "openAbout":
        renderAboutContent();
        showModal(aboutModal);
        break;
      case "openHelp":
        showModal(helpModal);
        break;
      case "openFaq":
        showModal(faqModal);
        break;
      case "config":
        window._showThoughts = msg.showThoughts;
        window._showToolCalls = msg.showToolCalls;
        document.querySelectorAll(".message-group.thought").forEach(function(el) {
          el.style.display = msg.showThoughts ? "" : "none";
        });
        document.querySelectorAll(".message-group.tool").forEach(function(el) {
          el.style.display = msg.showToolCalls ? "" : "none";
        });
        break;
      case "activeAgent":
      case "activeProfile":
        if (msg.name) {
          document.getElementById("profileLabel").textContent = msg.name;
        }
        break;
      case "pluginInfo":
        pluginInfo = msg;
        renderAboutContent();
        break;
      case "fileList":
        if (filePickerEl.dataset.requestId === msg.requestId) {
          renderFilePickerItems(msg.files || []);
        }
        break;
      case "filePreview":
        if (previewRequests.has(msg.requestId)) {
          const anchor = previewRequests.get(msg.requestId);
          previewRequests.delete(msg.requestId);
          showFilePreview(msg.path || "", msg.content, msg.error);
          positionFilePreview(anchor);
        }
        break;
      case "finishAssistantBubble":
        if (!isMessageForActiveSession(msg)) {
          break;
        }
        finalizeAssistantBubble();
        if (isPrompting && !awaitingFirstChunk) {
          setInputMode("stop");
        }
        break;
      case "permissionRequest":
        showPermissionRequest(msg);
        break;
      case "permissionUpdate":
        if (msg.id && pendingPermissions.has(msg.id)) {
          updatePermissionContent(
            pendingPermissions.get(msg.id),
            msg.title,
            msg.detail
          );
        }
        break;
      case "permissionDismiss":
        dismissPermissionRequest(msg.id, msg.status || locale.permissionCancelled);
        break;
      case "showContextAttach":
        showContextAttachPicker();
        break;
      case "hideContextAttach":
        hideContextAttachPicker();
        break;
      case "markSessionReset":
        insertLocalHistoryDivider();
        break;
    }
  });
  applyLocale();
  vscode.postMessage({ type: "ready" });
})();
