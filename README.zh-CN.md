<div align="center">

<img src="media/icon.png" alt="Rina Hermes ACP 图标" width="128" />

# Rina Hermes ACP

**在 VS Code 或 Cursor 中直接与 [Hermes Agent](https://hermes-agent.nousresearch.com) 对话 —— 无需切换终端。**

[English](README.md) · [更多能力](https://app.jove-rina.top)

</div>

---

## 产品简介

Rina Hermes ACP 是一款 VS Code / Cursor 扩展，将本地 Hermes Agent 接入编辑器侧边栏。你不必在终端和编辑器之间来回切换，即可在写代码的地方完成问答、工具调用与迭代。

扩展通过 [Agent Client Protocol (ACP)](https://agentclientprotocol.com) 连接本地 `hermes acp` 子进程：回复实时流式输出并支持 Markdown 渲染；代码块可一键插入编辑器；消息中的文件路径可直接在 VS Code 中打开。

**适合谁用？**

- 已在用 Hermes Agent、希望提升 IDE 内工作流的开发者
- 希望在当前工作区内使用 AI、并统一管理会话与模型的团队

**核心价值**

| 价值 | 说明 |
|------|------|
| 保持专注 | 侧边栏聊天，无需切到终端 |
| 工作区感知 | Agent 在项目目录运行；`@file` 引用可直接打开文件 |
| 多会话 | Tab 管理对话，本地持久化历史 |
| 过程可见 | 可选展示思考步骤与工具调用 |
| 双语界面 | 英文与简体中文（跟随 VS Code 显示语言） |

---

## 快速安装

### 环境要求

- **VS Code** 1.85 及以上，或 **Cursor**
- 已安装并配置 **[Hermes Agent](https://hermes-agent.nousresearch.com)**
- `hermes` 在系统 `PATH` 中可用（或在设置中配置 `hermes.path`）

### 在 VS Code 中安装

1. 打开 VS Code
2. 进入 **扩展**（`Ctrl+Shift+X` / `Cmd+Shift+X`）
3. 搜索 **Rina Hermes ACP** 或 **JoveRina**
4. 点击 **安装**

或从 [VS Code 扩展市场](https://marketplace.visualstudio.com/items?itemName=JoveRina.rina-hermes-acp) 安装。

### 在 Cursor 中安装

1. 打开 Cursor
2. 进入 **扩展**（`Ctrl+Shift+X` / `Cmd+Shift+X`）
3. 搜索 **Rina Hermes ACP** 或 **JoveRina**
4. 点击 **安装**

或从 [Open VSX](https://open-vsx.org/extension/JoveRina/rina-hermes-acp)（Cursor 扩展仓库）安装。

### 更多能力

访问 [app.jove-rina.top](https://app.jove-rina.top) 获取使用指南、技巧与相关工具。

### 验证安装

1. 在终端确认 `hermes` 可用：`hermes --version`
2. 点击左侧活动栏的 **Hermes Agent** 图标
3. 等待状态指示为 **就绪**（绿色）
4. 输入消息并按 **Enter** 发送

---

## 功能介绍

### 聊天与消息

- **侧边栏聊天面板** — 基于 WebView，支持流式回复
- **Markdown 渲染** — 语法高亮代码块（marked + highlight.js，DOMPurify 安全过滤）
- **多会话 Tab** — 新建、切换、重命名、删除对话；历史本地持久化
- **对话内搜索** — 在当前会话中查找关键词
- **停止生成** — 取消进行中的回复，不保存不完整内容

### 编辑器集成

- **插入代码块** — 点击回复中的代码块，插入到光标位置
- **@file 文件引用** — 输入 `@` 选择工作区文件；点击消息中的路径打开文件
- **发送选中代码** — 编辑器右键 → **Hermes：将选中内容插入聊天**
- **终端镜像** — Hermes 执行的 shell 命令同步到 VS Code 集成终端

### Agent 控制

- **多 Agent 切换** — 配置不同 path、profile、工作目录的命名 Agent
- **模型选择** — 通过 ACP `configOptions` 或 Hermes 原生 `models` / `session/set_model` 切换
- **Profile 选择器** — 快速切换 Hermes profile
- **权限确认** — 对 Agent 的文件 / 工具访问请求进行允许或拒绝

### 可见性与诊断

- **环境检测与配置** — 扳手菜单：扫描 Hermes 安装（L0–L5）、验证 `hermes --version`、检测 `hermes acp --check`；缺失时自动安装 `agent-client-protocol`；工具栏显示紧凑百分比进度
- **Token 用量环** — 工具栏显示输入 Token 占用
- **本地历史标注** — 切换会话时标注从本地恢复的消息（Agent 上下文已重置）
- **思考与工具调用** — 可选展示 Agent 推理过程与工具通知
- **连接日志** — 在聊天工具栏查看并复制 ACP 连接日志

### 国际化

- 界面跟随 VS Code 显示语言
- 支持：**English**、**中文(简体)**

---

## 如何使用

### 1. 打开聊天面板

- 点击左侧活动栏 **Hermes Agent** 图标，或
- 命令面板（`Ctrl+Shift+P` / `Cmd+Shift+P`）→ **Hermes：打开聊天**

### 2. 开始对话

1. 等待状态变为 **就绪**
2. 在底部输入框输入消息
3. 按 **Enter** 发送（**Shift+Enter** 换行）
4. 查看流式回复；需要时可点击 **停止** 取消

### 3. 引用文件

- 在输入框输入 `@` 打开文件选择器，附加工作区文件
- 点击消息中的文件路径，在编辑器中打开

### 4. 从编辑器发送代码

1. 在编辑器中选中代码
2. 右键 → **Hermes：将选中内容插入聊天**
3. 选中内容会连同文件路径与行号插入到聊天输入框

### 5. 管理会话

- 点击 **+ 新建** 开始新对话
- 通过 Tab 切换并查看本地历史
- 在 Tab 栏重命名或删除会话

> **说明：** 切换会话会重置 Agent 内存中的上下文。已保存的消息会从本地恢复并显示 **本地历史** 提示 —— Agent 本身不会保留该上下文，除非 Hermes 后续支持会话恢复。

### 6. 切换模型或 Profile

当 Hermes 配置暴露相应选项时，使用聊天工具栏的 **模型** 与 **Profile** 下拉菜单。

若 Agent 未提供模型列表，可在设置中配置备用模型（见下文）。

### 7. 命令

| 命令 | 说明 |
|------|------|
| `Hermes：新建对话` | 开始新会话 |
| `Hermes：打开聊天` | 打开聊天侧边栏 |
| `Hermes：将选中内容插入聊天` | 将编辑器选中代码发送到聊天输入框 |

### 8. 设置

打开 **设置**（`Ctrl+,` / `Cmd+,`），搜索 **Hermes**；或在聊天视图标题栏 **更多 → 配置** 直接打开本扩展设置：

| 设置项 | 说明 | 默认值 |
|--------|------|--------|
| `hermes.path` | Hermes 可执行文件路径 | 自动检测 |
| `hermes.cwd` | 会话工作目录 | 工作区根目录 |
| `hermes.profile` | Hermes profile 名称 | 默认 |
| `hermes.showThoughts` | 显示 Agent 思考过程 | `false` |
| `hermes.showToolCalls` | 显示工具调用通知 | `false` |
| `hermes.models` | Agent 未提供列表时的备用模型 | `[]` |
| `hermes.defaultModel` | 默认模型 id（仅备用列表） | `""` |
| `hermes.agents` | 用于快速切换的命名 Agent 配置 | `[]` |

**示例 — 多 Agent：**

```json
"hermes.agents": [
  { "name": "Default", "profile": "" },
  { "name": "Fast", "path": "/path/to/hermes", "profile": "fast" }
]
```

**示例 — 备用模型：**

```json
"hermes.models": [
  { "id": "claude-sonnet", "name": "Claude Sonnet" },
  { "id": "gpt-4o", "name": "GPT-4o" }
],
"hermes.defaultModel": "claude-sonnet"
```

修改与连接相关的设置后会自动重连。

### 常见问题

| 现象 | 处理建议 |
|------|----------|
| 一直显示 **连接中…** | 点击扳手菜单 **环境 → 环境检测**；确认 `hermes` 在 PATH 中或设置 `hermes.path` |
| **ACP 依赖缺失** | 检测会自动尝试 `pip install agent-client-protocol==0.9.0`；仍失败时在终端运行 `hermes acp --check` 与 `hermes acp` |
| **连接错误** | 点击工具栏 **重试**；通过 **更多选项 → 日志** 查看 Hermes 日志 |
| 模型列表为空 | 在设置中添加 `hermes.models` |
| Cursor 中 **配置** 无反应 | 使用聊天视图标题栏 **更多 → 配置** |
| 界面语言不符合预期 | 修改 VS Code 显示语言；切出再切回 Hermes 侧边栏 |

---

## BUG 提交与反馈

欢迎提交 Issue、功能建议与 Pull Request。

**提交 BUG**

1. 打开 [GitHub Issues](https://github.com/jove-rina/rina-hermes-acp/issues)
2. 点击 **New issue**
3. 请尽量包含：
   - VS Code 版本
   - 扩展版本（如 `0.3.1`）
   - Hermes Agent 版本（`hermes --version`）
   - 复现步骤
   - 预期行为 vs 实际行为
   - 相关日志（聊天工具栏 **更多选项 → 日志**）

**提交前**

- 先搜索 [已有 Issue](https://github.com/jove-rina/rina-hermes-acp/issues)，避免重复
- 确认 Hermes 在 VS Code 外可正常工作（例如在终端运行 `hermes acp`）

**相关链接**

- 代码仓库：[github.com/jove-rina/rina-hermes-acp](https://github.com/jove-rina/rina-hermes-acp)
- VS Code 扩展市场：[marketplace.visualstudio.com/items?itemName=JoveRina.rina-hermes-acp](https://marketplace.visualstudio.com/items?itemName=JoveRina.rina-hermes-acp)
- Cursor（Open VSX）：[open-vsx.org/extension/JoveRina/rina-hermes-acp](https://open-vsx.org/extension/JoveRina/rina-hermes-acp)
- 更多能力：[app.jove-rina.top](https://app.jove-rina.top)
- Hermes Agent 文档：[hermes-agent.nousresearch.com](https://hermes-agent.nousresearch.com)

---

## 许可证

MIT
