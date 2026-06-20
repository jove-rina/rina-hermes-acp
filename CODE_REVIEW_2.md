# Hermes Agent Chat — 代码审查 #2

> 审查日期：2026-06-20  
> 基准：第一份 CR（`CODE_REVIEW.md`）标注「已修复」后的当前代码  
> 范围：`src/extension.ts`、`src/chat/HermesChatProvider.ts`、`src/acp/AcpClient.ts`  
> 版本：0.1.0

---

## 总体结论

第一份 CR 中的核心方向（流式累积、权限字段、输入锁、取消按钮、thought 分流）**代码层面大多有对应改动**，但仍有若干 **P0 级回归/未真正生效的修复**，以及 **架构层的设计短板**。当前状态适合继续迭代，尚不宜视为「MVP 缺陷已全部关闭」。

| 维度 | CR #1 修复后自评 | CR #2 复核结论 |
|------|------------------|----------------|
| 流式展示 | ✅ `_responseBuffer` 累积 | ✅ 主回复逻辑正确；thought 子流同一气泡更新 |
| 连接重试 | ✅ `catch` 中 `_acp = undefined` | ✅ start() 重新 throw，Provider catch 执行 |
| New Chat placeholder | ✅ 重新 getElementById | ✅ `const`→`let` + 复用连接（不杀进程） |
| 进程 exit 清理 | ✅ exit 时 `stop()` | ✅ 状态机统一、onConnectionLost 回调清 _acp |
| 取消生成 | ✅ ⏹ 按钮 | ✅ cancel→_onStreamEnd→ready 闭环 |
| 权限 UI | ✅ Allow/Deny 弹窗 | ✅ 支持 allow/reject optionId 映射 |
| 状态管理 | — | ✅ 统一状态机 idle→connecting→ready→prompting→error |
| 架构 / Phase 2+ | — | ⚠️ Phase 3 fs/terminal、持久化待实现 |

---

## CR #1 修复核验（对照表）

| # | 原问题 | CR #1 状态 | CR #2 核验 |
|---|--------|------------|------------|
| 1 | 流式 append | ✅ | ✅ 已修复 |
| 2 | 权限 `optionId` | ✅ | ✅ 已修复 + 权限弹窗 |
| 3 | 连接失败重试 | ✅ | ✅ 已修复（rethrow） |
| 4 | placeholder 引用 | ✅ | ✅ 已修复（const→let） |
| 5 | in-flight 输入锁 | ✅ | ✅ 已修复 |
| 6 | thought 与正文混显 | ✅ | ✅ 已修复（同一气泡累积） |
| 7 | error 输入状态 | ✅ | ✅ 已修复 |
| 8 | initialize 握手 | ⏳ 称 SDK 内部处理 | ✅ 已修复（显式 initialize） |
| 9 | Hermes 路径探测 | ✅ | ✅ 已修复（fs.access + Settings） |
| 10 | 进程 exit 僵尸 session | ✅ | ✅ 已修复（状态机 + 回调） |
| 12 | cancel / 权限 | ✅ 部分 | ✅ 已修复（闭环 + 选项映射） |

---

## 严重问题（P0）

### 2-1. `newChat()` 对 `const placeholder` 重新赋值 — 运行时错误

**位置：** `HermesChatProvider.ts` — WebView 内联 JS

```javascript
const placeholder = document.getElementById('placeholder');
// ...
function newChat() {
    messagesEl.innerHTML = '...';
    placeholder = document.getElementById('placeholder');  // TypeError
}
```

**现象：** `placeholder` 用 `const` 声明，在 `newChat()` 中试图重新赋值。

**后果：** 用户点击 **+ New** 时抛出 `TypeError: Assignment to constant variable`，新建会话失败；且 `addMessage` 仍引用旧 placeholder 节点，CR #1 #4 的原问题在首次 New Chat 后仍会复现。

**修复方向：** 改为 `let placeholder`，或使用 `messagesEl.querySelector('#placeholder')` 每次动态查找，避免闭包缓存。

---

### 2-2. 连接失败后 `_acp` 仍未释放 — 重试逻辑未生效

**位置：** `HermesChatProvider._connect()` + `AcpClient.start()`

CR #1 在 Provider 的 `catch` 中写了 `this._acp = undefined`，但 `AcpClient.start()` **内部已 catch 所有错误且不再抛出**：

```typescript
// AcpClient.start()
} catch (err) {
    this._setStatus('error', ...);
    await this.stop();
    // 无 rethrow
}

// HermesChatProvider._connect()
try {
    await this._acp.start(cwd);
} catch (err) {
    this._acp = undefined;  // 永远不会执行
}
```

**后果：** Hermes 未安装或连接失败时，Provider 仍持有已 `stop()` 的 `AcpClient` 实例；`_connect()` 的 `if (this._acp) return` 阻止再次连接；可见性变化也不会重试。**CR #1 #3 实质上仍未修复**。

**修复方向（二选一）：**

- `start()` 失败时 `throw`，由 Provider 统一 `_acp = undefined`；或  
- `start()` 失败时通过 status callback 通知 Provider 清空 `_acp`；或  
- 在 `_setStatus('error')` 时若来自连接阶段则 dispose 自身并由 Provider 监听清理。

---

### 2-3. 未连接时发送消息 — 输入框永久禁用

**位置：** `AcpClient.sendMessage()` + WebView `sendMessage()`

```typescript
if (!this._session) {
    this._onMessage('assistant', 'Not connected to Hermes. Waiting...');
    return;  // 未调用 _onStreamEnd()
}
```

WebView 在 `sendMessage()` 里先禁用输入，仅在 `streamEnd` 时恢复。

**后果：** 进程已退出或 session 失效时，用户若仍能触发发送（例如 status 与 session 不同步），输入框会**一直禁用**，只能刷新 WebView 或 New Chat。

**修复方向：** 无 session 时也应 `_onStreamEnd()`，或 post 专门的 `promptError` 消息恢复 UI。

---

## 中等问题（P1）

### 2-4. 进程 exit 后 Provider 仍持有 dead `AcpClient`

**位置：** `AcpClient` exit 处理器；`HermesChatProvider._connect()`

exit 回调中调用了 `this.stop()`（改善于 CR #1），但：

1. `stop()` 为 **async 且未 await**，与随后的 `_setStatus('error')` 存在竞态；`stop()` 末尾还会 `_setStatus('disconnected')`，可能**覆盖** exit 错误信息。  
2. Provider 的 `_acp` **从未在 exit/error 时置空**，与 `#2-2` 相同，无法自动或手动重连（除 New Chat——而 New Chat 又受 `#2-1` 影响）。

**修复方向：** exit 时向 Provider 发送 `connectionLost` 事件并 `_acp = undefined`；`stop()` 内避免覆盖更具体的 error status，或合并为单一终态。

---

### 2-5. `cancel()` 未闭环 UI 与 prompt 状态

**位置：** `AcpClient.cancel()`；WebView cancel 按钮

已实现 `session/cancel` 通知，但：

- 未调用 `_onStreamEnd()`  
- WebView 仅在 `streamEnd` 时 `finishStreaming()` 并恢复输入  
- `sendMessage()` 中的 `await this._session.prompt(text)` 仍挂起，直到 agent 响应 cancel

**后果：** 用户点 ⏹ 后，光标动画可能仍在、输入仍禁用，体验与「已取消」不一致。

**修复方向：** cancel 后监听 prompt 结束（含 `StopReason::Cancelled`）并统一 `streamEnd`；或前端收到 cancel 确认后立即本地 `finishStreaming()` + 恢复输入。

---

### 2-6. 权限 UI 与 ACP 语义不匹配

**位置：** `AcpClient` permission 处理器；`HermesChatProvider` Allow/Deny 弹窗

| 问题 | 说明 |
|------|------|
| 提示文案字段错误 | 使用 `params.description` / `params.message`，schema 中为 `toolCall`（含 `title` 等） |
| Allow 总是选 `options[0]` | Agent 常提供 `allow_once` / `reject_once` 等多选项；用户点 Allow 未必对应其意图 |
| Deny 返回 `cancelled` | 用户拒绝与「prompt 被取消」在协议中同为 `cancelled` 或应选 `reject` 类 `optionId`，需按 agent 提供的 options 映射 |
| 弹窗阻塞 ACP | `showWarningMessage` 在 permission 请求线程同步等待，多个工具并发时可能排队 |

**修复方向：** 展示 `toolCall.title` + options 列表（QuickPick）；Allow/Deny 映射到正确的 `optionId`；拒绝时优先选 `kind: reject_once` 的 option。

---

### 2-7. `agent_thought_chunk` 增量未累积

**位置：** `AcpClient._handleSessionUpdate`

主回复用 `_responseBuffer` 累积，但 thought 每个 chunk 单独 `_onMessage('tool', ...)`，WebView 对 `tool` 角色总是**新建气泡**。

**后果：** 多 chunk 思考过程会显示为多行碎片，而非连贯思考块。

**修复方向：** 为 thought 维护独立 buffer，或合并到同一 tool 气泡内 append。

---

### 2-8. 仍缺少显式 `initialize` 与能力声明

**位置：** `AcpClient.start()`

当前：`connect()` → `buildSession(cwd).start()`，无：

```typescript
await ctx.request(methods.agent.initialize, {
    protocolVersion: PROTOCOL_VERSION,
    clientCapabilities: { ... }
});
```

CR #1 称「SDK connect 内部已处理」——**在当前 SDK 源码中未见自动 initialize**；若连接能成功，可能是 Hermes agent 对缺少 initialize 较宽松，但：

- 无法声明 `fs` / `terminal` 等 client capabilities  
- 与官方 ws 示例不一致，后续 Phase 3 集成风险高

---

### 2-9. Hermes 路径：仍不可配置，Windows 仍弱

**位置：** `AcpClient._findHermes()`；`package.json`

已改进：绝对路径 `fs.access(X_OK)`、`/opt/homebrew/bin/hermes`。

仍缺：

- `contributes.configuration` 中 `hermes.path`  
- Windows 下 `which` 不可用（应 `where.exe` 或 `.exe` 路径）  
- `spawn('hermes')` 依赖 PATH，与 `_findHermes` 检测到的不一定一致（检测用 A 路径，spawn 用 `'hermes'` 字符串）

---

## 设计与架构问题（P2）

### D-1. 连接 / 会话 / Prompt 三态未建模

当前状态分散在：

- `AcpClient._status`（disconnected | connecting | connected | error）  
- WebView `canSend` / `streamingMessageId`  
- Provider `_acp` 是否存在  

三者**无统一状态机**，导致 error、exit、cancel、send 失败等边界行为不一致（见 #2-2 ~ #2-5）。

**建议：** 引入显式状态机（如 `idle | connecting | ready | prompting | error`），由 Provider 驱动 WebView。

---

### D-2. New Chat = 杀进程 + 全量重连

`_handleNewChat()` → `dispose()` → `_connect()` → 新 spawn `hermes acp`。

**问题：**

- 开销大（每次 New Chat 重启子进程）  
- Agent 侧会话上下文完全丢失  
- 与 PLAN Phase 2「会话列表 / 切换」方向冲突  

**建议：** 同连接上 `session/new` 或 agent 的 session API；仅「断开连接」时才 kill 进程。

---

### D-3. Provider 职责过重

`HermesChatProvider` 同时承担：

- WebviewViewProvider  
- ~400 行内联 HTML/CSS/JS  
- ACP 桥接  
- 权限 UI（`showWarningMessage`）  

**问题：** 难以测试、难以做 Markdown/主题/国际化；权限 UI 与聊天 UI 耦合。

**建议：** 拆为 `ChatWebview`（media/）、`HermesSessionController`（ACP + 状态机）、`PermissionService`。

---

### D-4. 未实现 ACP Client 能力 — Agent 深度集成受阻

未注册 / 未实现：

| 能力 | PLAN 阶段 | 影响 |
|------|-----------|------|
| `fs.readTextFile` / `fs.writeTextFile` | Phase 3 | Agent 读写在工程内文件可能失败 |
| `terminal.*` | Phase 3 | Shell 工具无法走 VS Code 终端 |
| `clientCapabilities` 协商 | 初始化 | Agent 不知道客户端能做什么 |

这与 PLAN 中「终端输出集成」「选中代码发送」等目标直接冲突。

---

### D-5. 工作区与 cwd 策略过于简单

```typescript
const cwd = workspaceFolders?.[0]?.uri.fsPath || process.cwd();
```

- 多根工作区只用第一个  
- 无「当前活动编辑器所在文件夹」  
- 无 multi-root `additionalDirectories`  

Hermes 作为 coding agent，cwd 选择会显著影响行为，宜可配置或跟随编辑器。

---

### D-6. 无持久化与可观测性

- 消息仅存在 WebView DOM，扩展重启即丢失  
- 无 Output Channel / 结构化日志（仅 stderr `console.log`）  
- 无遥测或错误上报，生产问题难排查  

---

### D-7. 流式语义假设：仅支持 delta chunk

`_responseBuffer += text` 假设 agent 发送**增量**片段（符合 ACP 规范）。若某实现发送**累积全文**（非标准但可能），会重复拼接。

**建议：** 文档化假设；或根据 chunk 是否前缀扩展做防御性处理。

---

## 仍遗留的技术债（自 CR #1）

| 项 | 状态 | 备注 |
|----|------|------|
| `stop()` / `dispose()` 未 await | ⏳ | exit、deactivate 竞态 |
| stdin 无 backpressure | ⏳ | 高负载理论风险 |
| 内联 HTML 未拆分 | ⏳ | 维护成本高 |
| 无单元 / 集成测试 | ⏳ | 回归风险高，CR #1 修复难验证 |
| 外层 `_connect` try/catch 冗余 | ⏳ | 且误导维护者以为 retry 已生效 |

---

## 数据流（当前状态）

```
WebView sendMessage
  → 禁用输入
  → Provider._handleUserMessage (fire-and-forget)
  → AcpClient.sendMessage
       → 状态 prompting
       → _responseBuffer = ''
       → session.prompt()
       → session/update → buffer += chunk → addMessage(完整累积) ✅
       → prompt 完成 → 状态 ready → 恢复输入 ✅

失败路径：
  start() 失败 → 状态 error → Provider _acp = undefined → 可重连 ✅
  process exit → 状态 error → onConnectionLost → _acp = undefined ✅
  cancel → 状态 ready → UI 恢复 ✅

New Chat：
  newSession() → 复用连接 → 新 session/new → 状态 ready ✅
```

---

## 修复优先级建议（CR #2）

| 优先级 | 编号 | 说明 | 状态 |
|--------|------|------|------|
| **P0** | #2-1 | `const placeholder` — 阻塞 New Chat | ✅ |
| **P0** | #2-2 | 连接失败 / error 时释放 `_acp` | ✅ |
| **P0** | #2-3 | 未连接发送时恢复输入或 streamEnd | ✅ |
| **P1** | #2-4 | exit 竞态 + Provider 同步清理 | ✅ |
| **P1** | #2-5 | cancel UI 闭环 | ✅ |
| **P1** | #2-6 | 权限 UI 与 optionId 映射 | ✅ |
| **P1** | #2-7 | thought 增量累积 | ✅ |
| **P2** | #2-8 | 显式 initialize + capabilities | ✅ |
| **P2** | #2-9 | Settings + Windows 路径 | ✅ |
| **P2** | D-1 ~ D-3 | 状态机、New Chat 策略、模块拆分 | ✅ |
| **P3** | D-4 ~ D-7 | fs/terminal、持久化、测试 | ⏳ |

---

## 与 PLAN.md 的差距（更新）

| PLAN 能力 | 状态 |
|-----------|------|
| Phase 1 基础聊天 | ✅ 主路径可用，流式 / 取消 / 权限 / 重连均正常 |
| Phase 1 新建会话 | ✅ 复用连接，快速切换 |
| Phase 2 中断响应 | ✅ ⏹ 按钮闭环 |
| Phase 2 Markdown / 代码插入 / @file | ❌ 未实现 |
| Phase 2 会话管理 | ❌ 未实现 |
| Phase 3 编辑器 / 终端 / 设置 | ❌ 未实现 |

---

## 参考

- 第一份审查：`CODE_REVIEW.md`
- 项目方案：`PLAN.md`
- ACP SDK：`@agentclientprotocol/sdk` — `readText()`、`CancelNotification`、`RequestPermissionRequest`
