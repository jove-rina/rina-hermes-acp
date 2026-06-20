# Hermes Agent Chat — 代码审查 #5

> 审查日期：2026-06-20  
> 基准：CR #1–#4 标注修复后的当前代码 + **本轮新增「会话模型选择」**  
> 范围：`src/`、`media/`、`package.json`  
> 版本：`0.2.0-beta.1`

---

## 总体结论

第五轮在 CR #4 阻断项（WebView 脚本语法、会话切换 await/cwd、启动恢复活跃会话等）基础上，完成了**按会话选择 LLM 模型**的端到端能力：ACP `configOptions` 为主路径，Settings 兜底，持久化到 `sessions.json`。

编译通过；单元测试 `modelConfig` + `stateMachine` 共 **11 项全部通过**（`npx mocha out/tests/suite/*.test.js`）。集成测试仍依赖外网下载 VS Code，沙箱/离线环境无法跑通。

| 维度 | CR #4 结束时 | CR #5 复核 |
|------|--------------|------------|
| WebView 可用性 | ✅ TS 语法已移除 | ✅ 模型 UI 与 Agent 选择器解耦 |
| 会话模型选择 | ❌ 模型按钮误绑 Agent | ✅ ACP + Settings 双路径 |
| 持久化 | ✅ globalStorage + 活跃会话 | ✅ 每会话 `modelId` / `modelLabel` |
| Terminal ACP | ⚠️ stderr/args 部分修复 | ⚠️ `outputByteLimit` 仍缺；mirror 仍只发 `cmd` |
| 安全 | ⚠️ 列表转义；Markdown 未处理 | ⚠️ 同左；fs 边界有 `_isPathAllowed` 但无 workspace 时仍放行 |
| 测试 | ✅ 状态机 import 真实实现 | ✅ 新增 `modelConfig.test.ts` |

**当前状态：** 可作为 **0.2.0-beta.1** 功能验证；仍有 P1 项（error 后 dead `_acp`、Markdown XSS、`sendText` 异步连接竞态等）建议在 beta.2 前关闭。

---

## 第五轮功能：会话模型选择

### 产品目标

用户在输入区旁的 **模型按钮** 为当前**本地 UI 会话**选择 LLM 模型；切换会话时恢复该会话上次选择；与 **Agent 选择器（⬡）** 职责分离。

### 设计方案

```
┌─────────────────────────────────────────────────────────────┐
│  Hermes acp 返回 NewSessionResponse.configOptions           │
│    └─ type=select, category=model → 主路径                  │
│         UI 切换 → session/set_config_option                  │
│         推送 config_option_update → 刷新列表                │
├─────────────────────────────────────────────────────────────┤
│  Agent 无 model configOptions                               │
│    └─ Settings: hermes.models + hermes.defaultModel         │
│         仅本地持久化 modelId/modelLabel（fromAgent=false）  │
│         切换时提示「需 Agent 支持才能在运行时生效」          │
└─────────────────────────────────────────────────────────────┘
```

### 实现清单

| 层级 | 文件 | 内容 |
|------|------|------|
| 解析 | `src/acp/modelConfig.ts` | `findModelConfigOption`（优先 `category: "model"`）、`buildModelListState`、`buildFallbackModelListState` |
| ACP | `src/acp/AcpClient.ts` | `_configOptions`、`_syncConfigOptions`、`getModelListState()`、`setModel()` → `session/set_config_option`；`start` / `newSession` / `config_option_update` 同步 |
| Provider | `src/chat/HermesChatProvider.ts` | `SessionInfo.modelId/modelLabel`；`_postModelList`、`_handleSwitchModel`、`_applySessionModelPreference`；WebView 消息 `getModels` / `switchModel` |
| UI | `media/chat.html` | `renderModelList(payload)`、`modelList` 消息；打开下拉时 `getModels`；`activeAgent` 不再写 `modelBtn` |
| 配置 | `package.json` | `hermes.models`、`hermes.defaultModel` |
| 测试 | `src/tests/suite/modelConfig.test.ts` | 4 项单元测试 |

### WebView ↔ Extension 协议（新增）

| 方向 | type | 字段 |
|------|------|------|
| WebView → Ext | `getModels` | — |
| WebView → Ext | `switchModel` | `configId`, `valueId` |
| Ext → WebView | `modelList` | `configId`, `currentValueId`, `currentLabel`, `models[]`, `fromAgent` |

### 持久化

- `sessions.json` 每条会话增加可选字段 `modelId`、`modelLabel`
- 连接 / 切换会话 / New Chat 后调用 `_applySessionModelPreference()`：若 Agent 暴露 model config 且 id 在列表中，则 `setModel` 恢复
- 切换 Agent（`switchAgent`）会 **新建本地 sessionId**，模型偏好不继承（符合「换 Agent = 新对话」语义）

### 手动验证建议

1. Hermes 返回 `configOptions` 含 `category: "model"` → 下拉列表与 Agent 一致，切换后下一条消息使用新模型  
2. 无 configOptions → 在 Settings 配置 `hermes.models`，切换仅本地保存并 toast 提示  
3. 切换历史会话 → 模型按钮显示该会话保存的 label；重连后 Agent 侧 model 被 restore  
4. `prompting` 期间切换模型 → 应被阻止并 warning  

---

## CR #1–#4 修复核验（第五轮）

### CR #1（流式 / 权限 / 重连 / placeholder）

| # | 问题 | CR #5 |
|---|------|-------|
| 1-1 | 流式 append | ✅ `_responseBuffer` + WebView 累积 |
| 1-2 | 权限 `optionId` | ✅ |
| 1-3 | 连接失败重试 | ✅ `catch` → `_acp = undefined` |
| 1-4 | placeholder stale | ✅ `newChat` 后重取 DOM |

### CR #2（start 吞异常、状态机等）

| # | 问题 | CR #5 |
|---|------|-------|
| 2-1 | `start()` 失败仍留 `_acp` | ✅ rethrow + Provider catch 清 `_acp` |
| 2-2 | 状态机 | ✅ `canTransitionTo` 静态方法 + 单测 import 真实类 |

### CR #3（持久化 / Terminal / CDN 等）

| # | 问题 | CR #5 |
|---|------|-------|
| 3-1~3-5 | Terminal output、持久化路径、exit、CDN | ✅ 保持 |
| 3-6 | 会话切换 | ✅ await + `_resolveCwd()` |
| 3-9 | tool 更新合并 | ❌ 仍每次新气泡 |
| 3-11 | fs 边界 | ⚠️ 有 `_isPathAllowed`；**无 workspace 时仍 allow all** |
| 3-12 | Markdown XSS | ❌ 仍 `innerHTML = marked.parse` |

### CR #4（WebView 语法、会话语义等）

| # | 问题 | CR #5 |
|---|------|-------|
| 4-1 | TS 语法 `as HTMLElement` | ✅ 纯 JS `e.target.classList` |
| 4-2 | 切换会话 await/cwd | ✅ |
| 4-3 | `newSession` 失败 dead `_acp` | ❌ 仍调用 `onConnectionLost` 但 Provider **未**在 switch/newChat 失败路径清 `_acp` |
| 4-4 | Terminal stderr | ✅ 合并进 output |
| 4-5 | args/env/byteLimit | ⚠️ args/env ✅；**outputByteLimit 仍 false** |
| 4-6 | waitForExit `signal` | ✅ |
| 4-7 | 启动恢复活跃会话 | ✅ `active-session.txt` |
| 4-8 | sendText 未连接 | ⚠️ 有 warning + `_connect()`，但 **未 await**，消息可能仍发不出去 |
| 4-9 | fs 边界 | ⚠️ 部分修复（见 3-11） |
| 4-10 | 列表 XSS | ✅ `escapeHtml`；Markdown 未处理 |
| 4-11 | 测试 | ✅ + `modelConfig.test.ts` |

---

## 本轮新发现问题

### 5-1. Fallback 切换模型每次弹 Information  toast（P2）

**位置：** `HermesChatProvider._handleSwitchModel`

无 Agent config 时每次切换都 `showInformationMessage('Model preference saved locally...')`，频繁切换体验差。

**建议：** 仅首次 fallback 切换提示，或改为 status bar / 模型按钮 title 常驻说明。

---

### 5-2. VS Code Terminal mirror 与 ACP spawn 参数不一致（P1）

**位置：** `AcpClient._handleTerminalCreate` vs Provider `onTerminal` 回调

ACP 侧 `spawn(cmd, args, ...)` 正确；mirror 仍 `terminal.sendText(cmd)` **不含 args**。

**后果：** 用户看到的终端命令与 Agent 实际执行不一致。

**修复：** mirror 时拼接 `cmd + ' ' + args.join(' ')` 或传完整 command line。

---

### 5-3. `sendText` 异步连接竞态（P1，延续 #4-8）

**位置：** `HermesChatProvider.sendText`

```typescript
if (!this._acp) {
    vscode.window.showWarningMessage(...);
    this._connect();  // 未 await
}
this._acp?.sendMessage(text);  // 连接未完成时仍为 no-op
```

**后果：** 从命令面板「Send to Hermes」时，首条消息可能只进本地历史、未发往 Agent。

**修复：** `await this._connect()` 后再 `sendMessage`，或队列化待连接消息。

---

### 5-4. 无 `hermes.models` 且 Agent 无 configOptions 时 UI 空洞（P2）

**位置：** `_postModelList` → `models: []`，按钮显示 `default ▾`

**建议：** 空态文案引导用户配置 Settings 或升级 Hermes；与 Agent 列表空态一致。

---

### 5-5. 切换 Agent 后 `_modelState` 短暂 stale（P2）

**位置：** `_handleSwitchAgent` → `_connect`

重连前 WebView 仍可能显示上一 Agent 的 model 列表，直到 `onModelsChanged` 触发。

**修复：** switchAgent 时立即 `_modelState = null` 并 `_postModelList()` 显示 loading/默认。

---

### 5-6. `_applySessionModelPreference` 静默跳过未知 modelId（P2）

会话保存的 `modelId` 若不在 Agent 当前列表中（模型下线、换 profile），不 restore、不提示。

**建议：** log + 可选 toast「已保存的模型 xxx 不可用，使用默认」。

---

### 5-7. 缺少模型相关集成测试（P2）

仅有 `modelConfig` 纯函数单测；无 Provider / AcpClient mock 的 `setModel` 流程测试。

---

## 仍开放项汇总（跨轮）

| 优先级 | 编号 | 说明 |
|--------|------|------|
| P1 | #4-3 | `newSession` 失败保留 error 态 `_acp`，阻塞后续 `_connect` |
| P1 | #4-5 | Terminal `outputByteLimit` 未实现 |
| P1 | #5-2 | Terminal mirror 缺 args |
| P1 | #5-3 | `sendText` 未 await 连接 |
| P1 | #3-12 / #4-10 | Markdown `innerHTML` XSS |
| P1 | #3-11 / #4-9 | 无 workspace 时 fs 仍全放行 |
| P2 | #3-9 / #4-15 | tool_call 未按 id 合并 |
| P2 | #4-14 | Cancel 后可能持久化部分 assistant |
| P2 | #5-1 | Fallback 切换 toast 过频 |
| P2 | D-1 | 本地会话 vs ACP 会话语义未在 UI 标注 |

---

## 架构备注（模型选择）

```
WebView modelBtn click
  → getModels
  → Provider._postModelList()
       ├─ _modelState (from onModelsChanged)
       └─ or _buildFallbackModelList() from sessions.json + hermes.models

WebView pick model
  → switchModel { configId, valueId }
  → _handleSwitchModel
       ├─ fromAgent: AcpClient.setModel → session/set_config_option
       └─ fallback: _persistModelChoice only

ACP session/new | config_option_update
  → _syncConfigOptions → onModelsChanged → _postModelList
```

与 Agent 选择器关系：

| 控件 | 配置源 | 行为 |
|------|--------|------|
| ⬡ Agent | `hermes.agents` | 重连 Hermes（新 sessionId） |
| 模型 ▾ | ACP configOptions 或 `hermes.models` | 同 session 内切换 / 本地偏好 |

---

## 修复优先级建议（CR #5）

| 优先级 | 编号 | 说明 | 建议版本 |
|--------|------|------|----------|
| **P1** | #5-3 | sendText await 连接 | beta.2 |
| **P1** | #5-2 | Terminal mirror args | beta.2 |
| **P1** | #4-3 | newSession 失败释放 `_acp` | beta.2 |
| **P1** | #4-5 | outputByteLimit | beta.2 |
| **P1** | #3-12 | Markdown sanitize | beta.2 |
| **P2** | #5-1 | 减少 fallback toast | beta.2 |
| **P2** | #5-4 | 空模型列表引导 | beta.2 |
| **P2** | D-1 | 会话列表标注「本地历史」 | 0.3.0 |

---

## 测试记录

| 命令 | 结果 |
|------|------|
| `npm run compile` | ✅ 通过 |
| `npx mocha out/tests/suite/*.test.js` | ✅ 11 passing |
| `npm test`（VS Code 集成） | ❌ 需访问 `update.code.visualstudio.com` |

---

## 结论

第五轮**模型选择功能设计合理、实现完整**，修复了 CR #4 中模型按钮与 Agent 混用的产品缺陷，并补充了可测试的 `modelConfig` 模块。

建议在发布 **0.2.0-beta.1** 前人工验证：真实 `hermes acp` 是否返回 `category: "model"` 的 configOptions；若无，确认 Settings fallback 流程符合预期。

下一迭代（beta.2）优先：**sendText 连接竞态**、**Terminal mirror 一致性**、**error 态 `_acp` 释放**、**Markdown 消毒**。
