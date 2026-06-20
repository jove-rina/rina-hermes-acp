# Hermes AI Chat

**Chat with [Hermes Agent](https://hermes-agent.nousresearch.com) directly inside VS Code — no terminal switching required.**

[中文文档](README.zh-CN.md)

---

## Overview

Hermes AI Chat is a VS Code extension that brings your local Hermes Agent into the editor sidebar. Instead of juggling a separate terminal, you get a full chat experience right where you write code.

The extension connects to a local `hermes acp` subprocess over the [Agent Client Protocol (ACP)](https://agentclientprotocol.com), so you can ask questions, run tools, and iterate on code without leaving the IDE. Replies stream in real time with Markdown rendering; code blocks can be inserted into the editor with one click; file paths in messages open directly in VS Code.

**Who is it for?**

- Developers already using Hermes Agent who want a smoother in-editor workflow
- Teams that want AI assistance tied to the current workspace, with session history and model control in one place

**What you get**

| Benefit | Description |
|---------|-------------|
| Stay in flow | Sidebar chat — no alt-tab to a terminal |
| Workspace-aware | Agent runs in your project directory; `@file` references open in the editor |
| Multi-session | Tabbed conversations with local history persistence |
| Transparent | Optional visibility into thinking steps and tool calls |
| Bilingual UI | English and Simplified Chinese (follows VS Code display language) |

---

## Quick Install

### Requirements

- **VS Code** 1.85 or later
- **[Hermes Agent](https://hermes-agent.nousresearch.com)** installed and configured
- `hermes` available on your `PATH` (or set `hermes.path` in Settings)

### Install from VS Code Marketplace

1. Open VS Code.
2. Go to **Extensions** (`Ctrl+Shift+X` / `Cmd+Shift+X`).
3. Search for **Hermes AI Chat** or **JoveRina**.
4. Click **Install**.

### Verify installation

1. Confirm `hermes` works in a terminal: `hermes --version`
2. Click the **Hermes Agent** icon in the activity bar
3. Wait until the status indicator shows **Ready** (green)
4. Type a message and press **Enter**

---

## Features

### Chat & messaging

- **Sidebar chat panel** — WebView-based UI with streaming responses
- **Markdown rendering** — Syntax-highlighted code blocks (marked + highlight.js, sanitized with DOMPurify)
- **Multi-session tabs** — Create, switch, rename, and delete conversations; history persisted locally
- **In-conversation search** — Find keywords in the current session
- **Stop generation** — Cancel an in-progress response without saving partial output

### Editor integration

- **Insert code blocks** — Click a code block in a reply to insert it at the cursor
- **@file references** — Type `@` to pick workspace files; click paths in messages to open them
- **Send selection to chat** — Right-click selected code → **Hermes: Insert Selection into Chat**
- **Terminal mirror** — Shell commands from Hermes appear in a VS Code integrated terminal

### Agent control

- **Multi-agent switching** — Configure named agents with different paths, profiles, and working directories
- **Model selection** — Switch models via ACP `configOptions` or Hermes native `models` / `session/set_model`
- **Profile selector** — Quick switch between Hermes profiles
- **Permission prompts** — Approve or deny tool / file access requests from the agent

### Visibility & diagnostics

- **Token usage ring** — Input token usage indicator in the toolbar
- **Local history badge** — When switching sessions, UI marks messages restored from local storage (agent context is reset)
- **Thoughts & tool calls** — Optionally show agent reasoning and tool notifications
- **Connection logs** — View and copy ACP connection logs from the chat toolbar

### Internationalization

- UI follows VS Code display language
- Supported locales: **English**, **中文(简体)**

---

## How to Use

### 1. Open the chat panel

- Click the **Hermes Agent** icon in the left activity bar, or
- Run command palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) → **Hermes: Open Chat**

### 2. Start a conversation

1. Wait for status **Ready**
2. Type your message in the input box at the bottom
3. Press **Enter** to send ( **Shift+Enter** for a new line)
4. Watch the reply stream in; click **Stop** to cancel if needed

### 3. Reference files

- Type `@` in the input to open the file picker and attach a workspace file
- Click any file path in a message to open it in the editor

### 4. Work with code from the editor

1. Select code in any editor tab
2. Right-click → **Hermes: Insert Selection into Chat**
3. The selection is inserted into the chat input with file path and line number

### 5. Manage sessions

- Click **+ New** to start a fresh conversation
- Switch between tabs to revisit local history
- Rename or delete sessions from the tab bar

> **Note:** Switching sessions resets the agent's in-memory context. Previously saved messages are restored locally and marked with a **local history** banner — the agent does not retain that prior context unless Hermes adds session restore support.

### 6. Switch model or profile

Use the **Model** and **Profile** dropdowns in the chat toolbar when your Hermes setup exposes them.

If the agent does not provide a model list, configure fallback presets in Settings (see below).

### 7. Commands

| Command | Description |
|---------|-------------|
| `Hermes: New Chat` | Start a new conversation |
| `Hermes: Open Chat` | Open the chat sidebar |
| `Hermes: Insert Selection into Chat` | Send selected editor code to the chat input |

### 8. Settings

Open **Settings** (`Ctrl+,` / `Cmd+,`) and search for **Hermes**:

| Setting | Description | Default |
|---------|-------------|---------|
| `hermes.path` | Path to Hermes executable | auto-detect |
| `hermes.cwd` | Working directory for sessions | workspace root |
| `hermes.profile` | Hermes profile name | default |
| `hermes.showThoughts` | Show agent thinking process | `false` |
| `hermes.showToolCalls` | Show tool call notifications | `false` |
| `hermes.models` | Fallback model list when agent provides none | `[]` |
| `hermes.defaultModel` | Default model id (fallback list only) | `""` |
| `hermes.agents` | Named agent configurations for quick switching | `[]` |

**Example — multiple agents:**

```json
"hermes.agents": [
  { "name": "Default", "profile": "" },
  { "name": "Fast", "path": "/path/to/hermes", "profile": "fast" }
]
```

**Example — fallback models:**

```json
"hermes.models": [
  { "id": "claude-sonnet", "name": "Claude Sonnet" },
  { "id": "gpt-4o", "name": "GPT-4o" }
],
"hermes.defaultModel": "claude-sonnet"
```

Changes to connection-related settings trigger an automatic reconnect.

### Troubleshooting

| Symptom | What to try |
|---------|-------------|
| Stuck on **Connecting…** | Ensure `hermes` is on PATH or set `hermes.path`; run `hermes acp` manually to check for errors |
| **Connection error** | Click **Retry** in the toolbar; check Hermes logs via **More options → Logs** |
| Model not listed | Add entries under `hermes.models` in Settings |
| UI not in expected language | Set VS Code display language; switch away from and back to the Hermes sidebar |

---

## Bug Reports & Feedback

We welcome issues, feature requests, and pull requests.

**Report a bug**

1. Go to [GitHub Issues](https://github.com/jove-rina/hermes-ai-chat/issues)
2. Click **New issue**
3. Include:
   - VS Code version
   - Extension version (`0.2.1` or later)
   - Hermes Agent version (`hermes --version`)
   - Steps to reproduce
   - Expected vs. actual behavior
   - Relevant logs (**More options → Logs** in the chat toolbar)

**Before filing**

- Search [existing issues](https://github.com/jove-rina/hermes-ai-chat/issues) to avoid duplicates
- Confirm Hermes works outside VS Code (e.g. `hermes acp` in a terminal)

**Other links**

- Repository: [github.com/jove-rina/hermes-ai-chat](https://github.com/jove-rina/hermes-ai-chat)
- Hermes Agent docs: [hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com)

---

## License

MIT
