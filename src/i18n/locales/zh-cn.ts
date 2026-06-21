import { LocaleStrings } from '../types';

export const zhCn: LocaleStrings = {
    selectCodeFirst: '请先选中一些代码。',
    allowHermesRun: '允许 Hermes 执行：{0}',
    allow: '允许',
    deny: '拒绝',
    waitForResponse: '请等待当前回复完成后再切换模型。',
    failedSwitchModel: '切换模型失败：{0}',
    savedModelUnavailable: '已保存的模型「{0}」不可用。',
    modelPreferenceSaved: '模型偏好已本地保存。请在设置中配置 Hermes 模型或 hermes.models。',
    hermesNotConnected: 'Hermes 未连接。',
    couldNotOpenFile: '无法打开文件：{0}',
    hermesNotConnectedConnecting: 'Hermes 未连接，正在连接…',
    fileAccessDenied: '无法访问该文件',
    fileReadError: '无法读取文件',
    newChat: '新对话',
    defaultAgent: '默认',
    statusStartingAcp: '正在启动 Hermes ACP…',
    statusHermesThinking: 'Hermes 正在思考…',
    statusProcessError: '进程错误：{0}',
    statusProcessExited: '进程已退出（code: {0}, signal: {1}）',
    statusConnectionFailed: '连接失败：{0}',
    statusNewSessionFailed: '新建会话失败：{0}',

    connectionStatus: '连接状态',
    statusDisconnected: '未连接',
    statusConnecting: '连接中…',
    statusReady: '就绪',
    statusThinking: '思考中…',
    statusError: '错误',
    retry: '重新连接',
    switchProfile: '切换 Hermes Profile',
    profile: 'Profile',
    profiles: 'Profiles',
    switchModel: '切换模型',
    model: '模型',
    models: '模型列表',
    newChatBtn: '+ 新建',
    moreOptions: '更多选项',
    menuAbout: '关于',
    menuSettings: '配置',
    menuHelp: '帮助',
    menuLogs: '日志',

    connectingTitle: '正在连接 Hermes Agent…',
    connectingHint: '请确认已安装 Hermes 且可正常访问',
    readyPlaceholder: '就绪。开始新的对话吧。',
    connectionError: '连接错误。',
    retryConnect: '重新连接',

    inputPlaceholder: '给 Hermes 发消息…（输入 @ 引用文件）',
    resizeHandle: '拖拽调整输入框高度',
    filePicker: '文件选择器',
    searchChat: '搜索当前对话…',
    searchPrev: '上一个匹配 (↑)',
    searchNext: '下一个匹配 (↓)',
    clearChat: '清空当前对话',
    clearInput: '清空输入框',
    copySession: '复制当前会话',
    quickActions: '快捷操作',
    quickActionsExpand: '展开快捷操作',
    quickActionsCollapse: '收起快捷操作',
    tokenUsage: '输入 TOKEN 占比',
    send: '发送',
    stop: '停止',
    cancelResponse: '停止回复',

    hermesLogs: 'Hermes 日志',
    copy: '复制',
    clear: '清空',
    noLogs: '（暂无日志）',
    aboutTitle: '关于 Rina Hermes ACP',
    helpTitle: '帮助 — 如何启动 ACP',

    aboutVersion: '版本',
    aboutDescription: '在 VS Code 侧边栏直接与本地 <strong>Hermes Agent</strong> 对话。插件通过 ACP 协议自动启动 <code>hermes acp</code> 子进程，支持流式回复、多会话 Tab、模型切换与终端集成。',
    aboutFeatureTabs: '多会话 Tab 管理历史对话',
    aboutFeaturePickers: 'Profile / Model 选择器',
    aboutFeatureInsert: '代码块/表格复制与插入（对话框/编辑器）',
    aboutFeatureTools: '工具调用与思考过程（可配置显示）',
    repository: '仓库',

    helpHtml: `
            <h3>ACP 是什么？</h3>
            <p>本插件通过 <strong>Agent Client Protocol (ACP)</strong> 与本地 Hermes 通信。插件会自动启动 <code>hermes acp</code> 子进程，无需手动开终端。</p>

            <h3>1. 安装 Hermes</h3>
            <pre><code>curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash</code></pre>
            <p class="dim">安装后通常位于 <code>~/.hermes/hermes-agent/venv/bin/hermes</code>，或已在 PATH 中。</p>

            <h3>2. 验证 ACP 可启动</h3>
            <p>在终端手动测试（成功后会等待 stdin 输入，Ctrl+C 退出）：</p>
            <pre><code># 默认 profile
hermes acp

# 指定 profile
hermes --profile &lt;name&gt; acp</code></pre>

            <h3>3. 插件配置（Settings）</h3>
            <ul>
                <li><code>hermes.path</code> — Hermes 可执行文件路径（留空则自动检测）</li>
                <li><code>hermes.profile</code> — 对应 <code>--profile</code> 参数</li>
                <li><code>hermes.cwd</code> — Agent 工作目录（默认工作区根目录）</li>
            </ul>
            <p>点击视图标题栏 <strong>更多 → 配置</strong> 可打开 Settings，修改后<strong>实时生效</strong>（连接相关项会自动重连）。</p>

            <h3>4. 连接失败排查</h3>
            <ul>
                <li>确认 <code>hermes acp</code> 在终端能正常启动</li>
                <li>在 Settings 中设置正确的 <code>hermes.path</code></li>
                <li>点击视图标题栏 <strong>更多 → 日志</strong> 查看 ERROR/WARNING 日志</li>
            </ul>`,

    roleYou: '你',
    roleHermes: 'Hermes',
    roleThought: '思考',
    roleTool: '工具',
    roleMessage: '消息',
    permissionTitle: '需要授权',
    permissionCancelled: '已取消',
    permissionAllowOnce: '允许一次',
    permissionAllowAlways: '始终允许',
    permissionAllowSession: '本会话允许',
    permissionRejectOnce: '拒绝一次',
    permissionRejectAlways: '始终拒绝',
    permissionDeny: '拒绝',
    permissionExpand: '展开',
    permissionCollapse: '收起',
    permissionShowMore: '展开更多',
    permissionCardCollapse: '收起详情',
    permissionCardExpand: '展开详情',
    permissionSelected: '已选择：{0}',
    insert: '插入',
    emptyFile: '（空文件）',
    noMatchingFiles: '没有匹配的文件',
    searchingFiles: '搜索文件中…',
    configureAgents: '请在 Settings 中配置 hermes.agents',
    noModels: '无可用模型 — 请检查 Hermes profile 或 hermes.models',
    modelFromAgent: '来自 Hermes profile 的模型',
    modelLocalPreference: '本地模型偏好（Settings 回退）',
    tokenUsageLabel: '输入 TOKEN: {0} / {1} ({2}%)',
    copied: '已复制',
    clickToInsert: '点击插入到输入框',
    insertToInput: '插入到对话框',
    insertToEditor: '插入到编辑器',
    insertMenu: '插入',
    noActiveEditor: '请先打开一个编辑器',
    selectMessages: '选择',
    multiSelectAll: '全选',
    multiSelectDelete: '删除',
    multiSelectCopy: '复制',
    multiSelectExport: '导出',
    multiSelectExit: '退出',
    multiSelectCount: '已选 {0} 项',
    fileLinkTitle: '点击打开 · 悬停预览',
    tabRename: '重命名',
    tabClose: '关闭',
    tabContextSid: 'SID',
    tabContextExport: '导出',
    tabContextCopy: '复制',
    tabContextRename: '重命名',
    tabContextClose: '关闭',
    tabContextCloseOthers: '关闭其他',
    tabContextCloseLeft: '关闭左侧',
    tabContextCloseRight: '关闭右侧',
    tabContextCloseAll: '全部关闭',
    tabContextPin: '固定',
    tabContextUnpin: '释放',
    copySid: '复制会话 ID',
    sessionExportSessionId: '会话ID：{0}',
    sessionExportModel: '模型：{0}',
    sessionExportDate: '日期：{0}',
    sessionRendering: '正在渲染消息…',
    localHistoryDivider: '以上仅为本地聊天记录',
    localHistoryDividerTitle: 'Agent 上下文已重置，继续对话时不会带上方的内容',
    localHistoryBadge: '本地',
};
