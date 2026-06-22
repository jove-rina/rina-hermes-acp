# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-06-22

### Added

- **Environment detection** (view title **Environment** menu): Layered Hermes discovery (L0–L5), version verification, and compact **percentage progress** in the chat toolbar with expandable step details
- **ACP readiness check**: After Hermes is found, runs `hermes acp --check`; on failure, attempts `pip install agent-client-protocol==0.9.0` and re-checks
- **Environment configuration** (wrench menu): Configure Hermes to extension settings or system PATH; always available even when already configured
- **Smart detection trigger**: Skips full detection on connect when Hermes is already configured in the extension or on system PATH and passes quick verification (including ACP)
- **Cancel detection**: Closing the progress bar aborts an in-progress environment scan

### Fixed

- **Cursor — Settings**: **More → Settings** now opens the VS Code Settings UI filtered to this extension (instead of `settings.json`, which often did nothing visible in Cursor)
- Windows user PATH writes no longer corrupt paths due to JSON/PowerShell escaping
- Detection summary and detail titles reflect completion state; completed steps show success icons instead of spinners

## [0.3.0] - 2026-06-21

### Added

- **Session memory attach**: After an agent reset (model or session switch), optionally attach prior messages as reference text to the next send — last 2, last 10, all, or custom selection with preview and token estimate
- **`hermes.contextAttachVisibility` setting**: Control when the memory picker appears — `onNewSession` (default) / `always` / `never`
- **FAQ modal** (More → FAQ): Covers session reset behavior, model/session switching, Profile changes, model list completeness, updates, and bug reporting
- **Session reset divider** in chat UI marking messages restored from local history (view-only, not carried into agent context)
- **Session switch confirmation** when switching tabs during an active reply
- Unit tests for `contextAttach` module

### Fixed

- Model list falls back to cached ACP options when a fresh fetch returns empty

## [0.2.6] - 2026-06-21

### Added

- Auto-discover Hermes profiles via `hermes profile list` when `hermes.agents` is not configured
- Profile-isolated local session history and model preference storage (`profileStorage`)
- Hermes profile CLI arguments, ACP model catalog parsing, and grouped display (`acpModelCatalog`, `hermesProfile`, `profileDiscovery`)

### Fixed

- When selecting the **Default** profile, explicitly pass `--profile default` instead of launching `hermes acp` without a profile argument (which previously followed Hermes' globally active profile and caused incorrect default model display)
- Model list is now fetched **only via ACP**: prefer Hermes `model.options`, fall back to session `models.availableModels`; no longer reads `config.yaml`
- Model dropdown displays models grouped by provider; the selected model aligns with the profile default model returned by ACP
- On reconnect and retry, preserve the current profile in the chat UI instead of relying solely on workspace settings

## [0.2.5] - 2026-06-21

### Added

- **In-chat permission approval**: Show permission request cards in the WebView (replacing `showWarningMessage`), with approve/deny and session-level/permanent options; details collapsed by default, expandable when exceeding three lines
- **Approval history persistence**: Permission cards are written to session message history for read-only recovery after refresh or session switch
- **MCP config forwarding**: Read MCP servers from `~/.cursor/mcp.json` and workspace `.cursor` / `.vscode` `mcp.json`, passed to Hermes on `session/new`
- **Smart scroll during streaming**: Follow to bottom by default; pause when the user scrolls manually, resume after 5 seconds of inactivity while still streaming
- **TOKEN ring percentage**: Display current token usage percentage in the center of the ring
- Permission options i18n (`permissionOptions.ts`) and unit tests for `mcpConfig` / `permissionOptions`
- Integration test script `scripts/test-session-new.mjs`

### Fixed

- After approval or tool calls, subsequent assistant replies no longer incorrectly append to old bubbles but start a new message segment
- `allow_session` option no longer incorrectly displays as "Always allow" (`optionId` takes priority over `kind` mapping)

[0.3.1]: https://github.com/jove-rina/rina-hermes-acp/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/jove-rina/rina-hermes-acp/compare/v0.2.6...v0.3.0
[0.2.6]: https://github.com/jove-rina/rina-hermes-acp/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/jove-rina/rina-hermes-acp/compare/v0.2.2...v0.2.5
