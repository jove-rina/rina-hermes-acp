# Hermes Agent Chat — 代码审查 #3

> 审查日期：2026-06-20  
> 基准：CR #1（`CODE_REVIEW.md`）+ CR #2（`CODE_REVIEW_2.md`）标注修复后的当前代码  
> 范围：`src/`、`media/chat.html`、`package.json`  
> 版本：0.1.0

---

## 总体结论

相较 CR #2，项目在**架构与功能广度**上有明显进步：状态机、`initialize`、Settings、媒体文件拆分、会话元数据、Markdown/代码插入、`fs`/`terminal` 能力、Output Channel 等均已落地。CR #1 / #2 中的 P0 级逻辑缺陷**大部分已关闭**。

当前主要问题从「能不能聊」转为：

1. **ACP 终端实现存在功能性 bug**（Agent 读不到命令输出）  
2. **持久化设计与实现不一致**（用户消息丢失、流式重复写入、路径不当）  
3. **会话管理 UI 半成品**（列表有、切换无）  
4. **WebView 依赖外网 CDN**（离线/受限环境 Markdown 失效）  
5. **若干状态机边界与 schema Compliance 问题**

| 维度 | CR #2 结束时 | CR #3 复核 |
|------|--------------|------------|
| 核心聊天 / 流式 | ⚠️ 多处 P0 | ✅ 主路径基本可靠 |
| 连接 / 重试 / 状态机 | ⚠️ | ✅ 大幅改善；exit 竞态仍有问题 |
| 权限 | ⚠️ | ✅ 可用；多选项语义仍简化 |
| Phase 2（Markdown、取消、@file） | ❌ | ✅ 已实现（CDN 依赖见 #3-5） |
| Phase 2（会话切换） | ❌ | ⚠️ 仅有列表/删除，无加载 |
| Phase 3（fs / terminal / 设置 / 多 Agent） | ❌ | ⚠️ 已声明能力；terminal/fs 有实现缺陷 |
| 测试 | ❌ | ⚠️ 仅有状态机常量单测，未覆盖 AcpClient |

---

## CR #1 / #2 修复核验（第三轮）

| 原编号 | 问题 | CR #3 结论 |
|--------|------|------------|
| CR1 #1 | 流式 append | ✅ `_responseBuffer` + WebView 更新同一气泡 |
| CR1 #2 | 权限 `optionId` | ✅ 支持 allow/reject 选项映射 |
| CR1 #3 | 连接失败重试 | ✅ `start()` rethrow + Provider `_acp = undefined` |
| CR1 #4 | placeholder 引用 | ✅ `let placeholder` + `media/chat.html` |
| CR1 #5 | in-flight 锁 | ✅ `prompting` 禁发、`ready` 恢复 |
| CR1 #6 | thought 混显 | ✅ 独立 `thought` 角色 + `_thoughtBuffer` |
| CR2 #2-2 | `_acp` 未释放 | ✅ `onConnectionLost` + catch |
| CR2 #2-3 | 未连接时输入卡死 | ✅ 改由状态机 `ready`/`prompting` 驱动 UI |
| CR2 #2-5 | cancel 未闭环 | ✅ `cancel()` → `_transitionTo('ready')` |
| CR2 #2-8 | initialize | ✅ 已显式调用（字段见 #3-8） |
| CR2 #2-9 | Hermes 路径配置 | ✅ Settings + `fs.access`（Windows 仍弱） |
| CR2 D-2 | New Chat 杀进程 | ✅ `newSession()` 复用连接 |
| CR2 D-3 | 内联 HTML | ✅ 拆至 `media/chat.html` |
| CR2 D-4 | fs / terminal | ⚠️ 已注册 handler，**terminal 输出 bug（#3-1）** |
| CR2 D-5 | cwd 策略 | ✅ 活动编辑器 workspace folder 优先 |
| CR2 D-6 | 持久化 | ⚠️ 有文件持久化，**设计/数据完整性有问题（#3-2）** |

---

## 严重问题（P0）

### 3-1. ACP Terminal 输出始终为空 — Agent 无法获取命令结果

**位置：** `AcpClient._handleTerminalCreate` / `_handleTerminalOutput`

**现象：** `stdout`/`stderr` 在局部变量中累积，但写入 `TerminalInstance` 的是**创建时的空字符串快照**，后续 chunk 未同步回 `term` 对象：

```typescript
let stdout = '';
proc.stdout?.on('data', (chunk) => { stdout += chunk.toString(); });
const term = { ..., stdout, stderr, ... };  // 固定为空，不再更新
```

**后果：** Agent 通过 `terminal/output` 读到的 `output` 恒为空，工具调用（跑测试、构建等）在 ACP 语义下**静默失败**。VS Code 终端镜像仅给人看，不能替代 ACP 回传。

**附带：** `_handleTerminalOutput` 返回形状不符合 schema（缺少必填 `truncated`；`exitCode`/`exitSignal` 应为 `exitStatus` 对象；不应有 `errorOutput` 字段）。

**修复方向：** 在 `TerminalInstance` 上维护可变 buffer（或引用同一对象）；按 `TerminalOutputResponse` 返回 `{ output, truncated: false, exitStatus }`。

---

### 3-2. 聊天持久化：用户消息丢失 + 助手消息重复写入

**位置：** `HermesChatProvider._handleUserMessage`、消息 callback 中的 `_saveMessage`

**现象：**

| 路径 | 用户消息 | 助手消息 |
|------|----------|----------|
| WebView 正常发送 | WebView 本地展示，**Provider 不 `_saveMessage`** | 每个 stream chunk 触发 callback → **每条 chunk 追加一条 history** |
| `sendText` 命令 | ✅ 保存 | 同左 |

**后果：**

- 重启后 `_restoreMessages()` **缺少用户侧对话**，会话不完整  
- `.chat-history.json` 中助手回复被 chunk 重复刷屏（最多保留 100 条，更快截断有效上下文）  
- `_sessions` 元数据 `messageCount` 与真实可读历史不一致  

**修复方向：** 在 `_handleUserMessage` 保存 user；助手仅在 `prompt` 完成或 `ready` 状态时保存最终 `_responseBuffer` 一次。

---

### 3-3. 持久化路径写在扩展安装目录

**位置：** `HermesChatProvider` 构造函数

```typescript
this._historyPath = path.join(_extensionUri.fsPath, '.chat-history.json');
this._sessionsPath = path.join(_extensionUri.fsPath, '.sessions.json');
```

**现象：** 使用 `extensionUri`（扩展包目录），而非 `ExtensionContext.globalStorageUri`。

**后果：**

- 打包 VSIX 后目录可能只读或与其他工作区共享同一路径  
- 不符合 VS Code 扩展存储惯例，升级/重装扩展可能丢数据或写入失败（当前 catch 静默吞掉）

**修复方向：** 构造函数传入 `ExtensionContext`，路径改为 `context.globalStorageUri`；按 `sessionId` 分文件存储消息。

---

### 3-4. 进程 exit 后 error 状态无法生效（状态机竞态）

**位置：** `AcpClient` — `_process.on('exit')`

```typescript
this.stop();                              // 内部 _transitionTo('idle')
this._transitionTo('error', `Process exited...`);  // idle → error 非法，被忽略
this._onConnectionLost();
```

状态机定义：`idle` 仅允许 → `connecting`。

**后果：** 子进程崩溃时 UI 往往显示 **idle/Disconnected**，而非明确 error 信息；与 CR #2 #2-4 修复意图部分抵消（`_acp` 会通过 callback 清空，但用户反馈不准确）。

**修复方向：** exit 时先 `_transitionTo('error', ...)` 再 cleanup；或允许 `idle → error`；或 `stop()` 不强制回 idle 当原状态为 error。

---

### 3-5. WebView 依赖外网 CDN — Markdown / 高亮离线不可用

**位置：** `media/chat.html`

```html
<link href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/...">
<script src="https://cdnjs.cloudflare.com/ajax/libs/marked/...">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/...">
```

**现象：** 未 vendoring 到 `media/`，未使用 `webview.asWebviewUri`；默认 WebView CSP 对远程脚本限制因 VS Code 版本而异。

**后果：** 无网络、企业代理、严格 CSP 下 **Markdown 渲染、代码高亮、Insert 按钮逻辑全部失效**；Phase 2 核心体验不稳定。

**修复方向：** 将 `marked`、`highlight.js` 放入 `media/vendor/`，本地引用；必要时在扩展 manifest 配置 `webview.contentSecurityPolicy`（若仍需要 CDN 则显式 allowlist）。

---

## 中等问题（P1）

### 3-6. 会话列表为「半实现」— 无法切换/恢复历史会话

**位置：** `media/chat.html` — `renderSessionList`；`HermesChatProvider`

```javascript
// Click to view is disabled for now — future: session switching
```

**现象：**

- UI 展示 session 列表、支持删除元数据  
- **点击 session 无 handler**；消息仅存在单一 `.chat-history.json`，未按 session 分存  
- `deleteSession` 只删列表项，不删对应该 session 的消息文件  

**后果：** PLAN Phase 2「列出/切换/删除历史会话」**只完成约 1/3**；用户会误以为列表可切换。

**修复方向：** 按 `sessionId` 存 `{sessionId}.json`；点击切换时加载并 `_restoreMessages()`；删除时同步删文件。

---

### 3-7. `initialize` 请求含非 schema 字段

**位置：** `AcpClient.start()`

```typescript
await ctx.request(methods.agent.initialize, {
    protocolVersion: PROTOCOL_VERSION,
    capabilities: {},              // ❌ 不在 InitializeRequest 中
    clientCapabilities: {
        session: { update: true }, // ❌ ClientCapabilities 无 session 字段
        fs: { readTextFile: true, writeTextFile: true },
        terminal: true
    }
} as any);
```

**后果：** 依赖 `as any` 绕过类型检查；未知字段可能被 agent 忽略或导致严格校验失败；`fs`/`terminal` 正确字段已声明，但整体请求不够干净。

**修复方向：** 移除 `capabilities` 与 `session`；补充可选 `clientInfo`；去掉 `as any`。

---

### 3-8. 非 `ready` 状态调用 `sendMessage` 的非法状态迁移

**位置：** `AcpClient.sendMessage()`

```typescript
if (this._status !== 'ready') {
    this._onMessage('assistant', 'Please wait for connection...');
    this._transitionTo('ready');  // 从 error/idle/connecting 均非法
    return;
}
```

**后果：** 误触发送时提示消息后状态不变；在 `error`/`idle` 下无法通过发送触发重连。

**修复方向：** 仅提示并 return；或触发 Provider 重连，而非强行 `ready`。

---

### 3-9. 工具调用 UI：每次 `tool_call_update` 新建一行

**位置：** `AcpClient._handleSessionUpdate`；WebView `addMessage('tool', ...)`

**现象：** 同一 tool 的 progress 更新不会合并，而是多条 `🔧` / `⚙️` 气泡。

**后果：** 复杂任务时消息区刷屏，可读性差。

**修复方向：** 以 `toolCallId` 为 key 更新同一 DOM 节点（与 thought 流式更新类似）。

---

### 3-10. Terminal 实现与 VS Code 终端「双轨」且参数不完整

**位置：** `AcpClient._handleTerminalCreate` + Provider terminal callback

**现象：**

- 对 Agent：后台 `spawn(cmd, [], { shell: true })`  
- 对用户：`vscode.window.createTerminal` + `sendText`  
- 忽略 ACP 请求中的 `args`、`env`、`outputByteLimit`  

**后果：** 用户看到的终端与 Agent 读取的后台进程**可能不一致**；带参数命令行为错误。

**修复方向：** 以 ACP 子进程为准向 Agent 回传 output；VS Code 终端仅可选 mirror；正确拼接 `command` + `args`。

---

### 3-11. `fs` 读写无工作区边界约束

**位置：** Provider 中 `readTextFile` / `writeTextFile` 回调

**现象：** Agent 请求任意绝对路径即可读写（受 OS 权限限制）。

**后果：** 符合「全权限 Agent」场景，但缺少 workspace trust / 路径 allowlist，误操作或恶意 prompt 风险较高。

**修复方向：** 限制在 workspace folders + `hermes.cwd`；写操作二次确认或仅 allowlist 扩展名。

---

### 3-12. Markdown 渲染使用 `innerHTML` — Agent 内容 XSS 面

**位置：** `media/chat.html` — `finishStreaming` / `ready` 重渲染

```javascript
el.innerHTML = marked.parse(text);
```

**后果：** 若 Hermes 输出含恶意 HTML/脚本，在 WebView 内执行（虽受 VS Code 沙箱约束，仍属不必要的 attack surface）。

**修复方向：** 使用 marked 的 sanitize 选项、DOMPurify，或仅允许受限标签。

---

### 3-13. 测试覆盖不足且与实现漂移

**位置：** `src/tests/suite/stateMachine.test.ts`

**现象：**

- 测试**复制**了 `AcpClient.VALID` 常量，未 import 真实实现 — 改状态机时测试可能仍绿  
- 无 `AcpClient` 单元测试（terminal output、permission mapping、buffer 逻辑）  
- `@vscode/test-electron` 集成测试需外网下载 VS Code（CI/离线易失败）

**修复方向：** 导出并测试 `_transitionTo` / terminal handlers；mock stdio 测 buffer；CI 缓存 VS Code 或使用纯 unit test。

---

## 设计与架构问题（P2）

### D-1. `HermesChatProvider` 仍是「上帝对象」

虽已拆分 `media/chat.html`，Provider 仍负责：WebView 生命周期、ACP 连接、权限 UI、fs/terminal 委托、会话 CRUD、历史 IO、配置解析、日志。

**风险：** Phase 3 继续堆功能会导致文件再次膨胀、难以单测。

**建议模块：**

```
SessionStore     — 按 sessionId 读写消息
HermesConnection — 封装 AcpClient 生命周期
ChatWebviewBridge — postMessage 协议
PermissionService — 已有逻辑可抽出
```

---

### D-2. 双通道状态：WebView `canSend` 与 AcpClient `_status` 手动同步

WebView 通过 `status` 消息维护 `canSend`；AcpClient 有独立状态机。二者大部分一致，但**无单一 source of truth**（例如 #3-4 exit 时两边对「error」理解不同）。

**建议：** Provider 根据 `AcpStatus` 统一映射 UI 消息，WebView 不自行推断业务规则。

---

### D-3. Agent 切换 = 硬重置，无并行连接

`_handleSwitchAgent` dispose 连接、清空消息、重连。PLAN Phase 3「多 Agent 切换」若指**并行**或多 profile 热切换，当前是**串行重建**，切换成本高。

---

### D-4. Output Channel 与 stderr 日志未关联

ACP stderr 仍 `console.log` 到扩展 host；Output Channel 有结构化 `_log`，但 stderr 未汇入，排障需两处看。

---

### D-5. 配置项 `hermes.agents` 无校验与文档示例

`package.json` 声明 array of objects，但无 `markdownDescription` 示例；错误配置仅 silent fallback。

---

## 轻微问题 / 技术债（P3）

| # | 问题 | 位置 |
|---|------|------|
| 3-14 | 初始 status dot 类名 `disconnected`，状态机用 `idle` | `chat.html` |
| 3-15 | `_findHermes()` 在 Windows 仍依赖 `which` | `AcpClient` |
| 3-16 | `writeTextFile` handler 未显式返回 `{}` | `AcpClient` |
| 3-17 | `newSession` 失败置 `error` 但不 rethrow，调用方无感知 | `AcpClient` |
| 3-18 | `.vscodeignore` 未排除 `CODE_REVIEW*.md`，会打进 VSIX | 打包 |
| 3-19 | `@file` 正则 `[\\w./\\-]+` 不支持含空格路径 | `chat.html` |
| 3-20 | 用户消息不走 Markdown 渲染（一般可接受） | `chat.html` |

---

## 数据流（当前架构）

```
┌─────────────────────────────────────────────────────────┐
│  media/chat.html (CDN: marked/hljs)                     │
│    canSend ← status(ready|prompting|error|idle)         │
└────────────────────┬────────────────────────────────────┘
                     │ postMessage
┌────────────────────▼────────────────────────────────────┐
│  HermesChatProvider                                     │
│    .chat-history.json  ← ⚠ 路径/完整性问题 (#3-2,#3-3)   │
│    Permission / fs / terminal 回调                        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  AcpClient (状态机 idle→connecting→ready⇄prompting)      │
│    initialize → session/new → prompt                    │
│    terminal/* → ⚠ 空 output (#3-1)                      │
│    fs/* → vscode.workspace.fs                           │
└────────────────────┬────────────────────────────────────┘
                     │ stdio ACP
              hermes acp 子进程
```

---

## 修复优先级建议（CR #3）

| 优先级 | 编号 | 说明 |
|--------|------|------|
| **P0** | #3-1 | Terminal 输出 — 阻塞 Agent 工具链 |
| **P0** | #3-2 | 持久化数据完整性 |
| **P0** | #3-3 | globalStorageUri |
| **P0** | #3-4 | exit 状态机 |
| **P0** | #3-5 | CDN → 本地 vendor |
| **P1** | #3-6 | 会话切换闭环 |
| **P1** | #3-7 ~ #3-10 | schema、sendMessage、tool UI、terminal 参数 |
| **P1** | #3-11 ~ #3-13 | 安全、测试 |
| **P2** | D-1 ~ D-5 | 模块拆分、状态统一、文档 |

---

## 与 PLAN.md 的对齐度（更新）

| PLAN 项 | CR #3 状态 |
|---------|------------|
| Phase 1 侧边栏聊天 | ✅ |
| Phase 1 流式回复 | ✅ |
| Phase 1 新建会话 | ✅（`newSession`，无 P0 级 placeholder bug） |
| Phase 2 Markdown + 代码高亮 | ⚠️ 有，依赖 CDN |
| Phase 2 代码插入 | ✅ |
| Phase 2 @file | ⚠️ 正则有限 |
| Phase 2 中断响应 | ✅ |
| Phase 2 会话管理 | ⚠️ 列表/删除 only |
| Phase 3 选中代码发送 | ✅ `hermes.sendSelection` |
| Phase 3 终端集成 | ⚠️ UI 有 mirror；ACP 回传 broken |
| Phase 3 多 Agent | ⚠️ 配置 + 切换有；非并行 |
| Phase 3 设置页 | ✅ `contributes.configuration` |

---

## 结论

项目已从「MVP 原型」进入「**功能面较全的早期产品**」阶段，CR #1 / #2 的核心聊天与连接问题**基本解决**。第三轮审查的重点应转向：

1. **ACP 协议合规与正确性**（尤其 terminal）  
2. **持久化与会话模型的真实可用性**  
3. **WebView 离线可依赖**  
4. **测试与模块边界**

完成 P0 项后，可认为达到 **0.2.0  beta 质量**；当前 **0.1.0** 适合内部 dogfood，尚不建议对外宣称 Phase 2/3 已全部完成。

---

## 参考

- `CODE_REVIEW.md` — 第一轮  
- `CODE_REVIEW_2.md` — 第二轮  
- `PLAN.md` — 产品方案  
- ACP Schema — `InitializeRequest`、`TerminalOutputResponse`、`CreateTerminalRequest`
