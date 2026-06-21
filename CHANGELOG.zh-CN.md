# 更新日志

**Rina Hermes ACP** 的所有重要变更均记录于此。

本文档为**简体中文**版本。默认语言（英文）见 [CHANGELOG.md](CHANGELOG.md)。

格式参考 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.3.0] - 2026-06-21

### 新增

- **会话记忆附带**：Agent 重置（切换模型或会话）后，可将上轮消息作为参考文本附带到下一条发送 —— 支持最近 2 条、最近 10 条、全部或自选，含预览与 Token 估算
- **`hermes.contextAttachVisibility` 设置**：控制记忆选择框显示时机 —— `onNewSession`（默认）/ `always` / `never`
- **FAQ 弹窗**（更多 → FAQ）：涵盖会话重置机制、模型/会话切换、Profile 切换、模型列表、更新与 BUG 提交
- **会话重置分隔线**：聊天 UI 标注从本地恢复的消息（仅供查看，不会带入 Agent 上下文）
- **切换会话确认**：生成回复过程中切换 Tab 时弹出确认提示
- `contextAttach` 模块单元测试

### 修复

- 模型列表在 ACP 重新拉取为空时，回退到已缓存的选项

## [0.2.6] - 2026-06-21

### 新增

- 未配置 `hermes.agents` 时，通过 `hermes profile list` 自动发现 Hermes profile
- 按 profile 隔离的本地会话历史与模型偏好存储（`profileStorage`）
- Hermes profile CLI 参数、ACP 模型目录解析与分组展示（`acpModelCatalog`、`hermesProfile`、`profileDiscovery`）

### 修复

- 选择「默认」Profile 时显式传递 `--profile default`，不再以无 profile 参数启动 `hermes acp`（此前会跟随 Hermes 全局激活 profile，导致默认模型显示错误）
- 模型列表改为**仅通过 ACP** 获取：优先调用 Hermes `model.options`，回退到会话 `models.availableModels`；不再读取 `config.yaml`
- 模型下拉按供应商分组显示；当前选中模型优先对齐 ACP 返回的 profile 默认模型
- 重连与重试时保留聊天 UI 中的当前 profile，不再仅依赖工作区设置

## [0.2.5] - 2026-06-21

### 新增

- **聊天内权限审批**：在 WebView 中展示权限请求卡片（替代 `showWarningMessage`），支持批准/拒绝及会话级/永久选项；详情默认折叠，超出三行可展开
- **审批历史持久化**：权限卡片写入会话消息记录，刷新或切换会话后可只读恢复
- **MCP 配置转发**：从 `~/.cursor/mcp.json` 及工作区 `.cursor` / `.vscode` 的 `mcp.json` 读取 MCP 服务器，并在 `session/new` 时传给 Hermes
- **流式推送智能滚动**：默认跟随到底部；用户手动滚动后暂停，5 秒无操作且仍在推送时恢复
- **TOKEN 圆环占比**：圆环中心显示当前 token 使用百分比
- 权限选项 i18n（`permissionOptions.ts`）及 `mcpConfig` / `permissionOptions` 单元测试
- 集成测试脚本 `scripts/test-session-new.mjs`

### 修复

- 审批或工具调用后，后续助手回复不再错误追加到旧气泡，而是开启新消息段
- `allow_session` 选项不再误显示为「始终允许」（`optionId` 优先于 `kind` 映射）

## [0.2.2] - 2026-06-20

### 变更

- 扩展与仓库由 **hermes-ai-chat** 重命名为 **rina-hermes-acp**。
- 改进 `hermes.agents` 配置校验与类型定义（`HermesAgentConfig`）。

## [0.2.0] - 2026-06-13

### 新增

- 侧边栏聊天面板，支持流式 Markdown 渲染（marked、highlight.js、DOMPurify）。
- 多会话 Tab 与本地历史持久化。
- 聊天工具栏模型选择下拉（ACP `configOptions` 与 Hermes 原生 `session/set_model`）。
- 通过 `hermes.agents` 切换命名 Agent（path、profile、cwd）。
- 思考过程与工具调用显示开关（默认关闭）。
- 双语界面：英文与简体中文（跟随 VS Code 显示语言）。
- `@file` 引用、代码块插入、选中内容发送到聊天、集成终端镜像。
- 权限确认、连接重试、Token 用量显示与聊天内诊断日志。

### 修复

- 流式光标使用字面量字符 `▎`，修复 Unicode 转义显示异常。
- 日志面板复制/清空；stderr 过滤以减少无关输出。
- 多轮 Code Review（CR #2–#5）中的稳定性与体验修复。

### 变更

- 面向市场的图标、README 与 VSIX 打包（bundle 中排除 icon.svg）。
- 显示名称定为 **Rina Hermes ACP**（此前受 Marketplace 命名限制经历 **Hermes AI Chat** 等调整）。

[0.3.0]: https://github.com/jove-rina/rina-hermes-acp/compare/v0.2.6...v0.3.0
[0.2.6]: https://github.com/jove-rina/rina-hermes-acp/compare/v0.2.5...v0.2.6
[0.2.5]: https://github.com/jove-rina/rina-hermes-acp/compare/v0.2.2...v0.2.5
[0.2.2]: https://github.com/jove-rina/rina-hermes-acp/compare/v0.2.0...v0.2.2
[0.2.0]: https://github.com/jove-rina/rina-hermes-acp/releases/tag/v0.2.0
