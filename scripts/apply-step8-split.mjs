/**
 * Step 8: extract connection, info modals, group-utils; wire factories.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const chatAppPath = path.join(fileURLToPath(new URL('.', import.meta.url)), '..', 'media', 'src', 'chat-app.js');
const lines = fs.readFileSync(chatAppPath, 'utf-8').split(/\r?\n/);

const removeSet = new Set();
for (const [s, e] of [
    [421, 499], // connection status / retry
    [515, 529], // getSessionPlainText
    [539, 582], // isSelectableRole + session index + group text helpers
    [746, 824], // about/help/faq modals
    [829, 837], // downloadSessionMarkdown
]) {
    for (let i = s; i <= e; i++) removeSet.add(i);
}

let body = lines.filter((_, idx) => !removeSet.has(idx + 1)).join('\n');

const extraImports = `import { createGroupUtils, isSelectableRole, downloadSessionMarkdown } from './messages/group-utils.js';
import { createConnection } from './connection/index.js';
import { createInfoModals } from './ui/info-modals.js';
`;

body = body.replace(
    "import { createPickers } from './pickers/index.js';",
    "import { createPickers } from './pickers/index.js';\n" + extraImports,
);

body = body.replace(
    `        const aboutModalTitle = document.getElementById('aboutModalTitle');
        if (aboutModalTitle) aboutModalTitle.textContent = locale.aboutTitle;
        const helpModalTitle = document.getElementById('helpModalTitle');
        if (helpModalTitle) helpModalTitle.textContent = locale.helpTitle;
        const helpModalBody = document.getElementById('helpModalBody');
        if (helpModalBody) helpModalBody.innerHTML = locale.helpHtml;
        const faqModalTitle = document.getElementById('faqModalTitle');
        if (faqModalTitle) faqModalTitle.textContent = locale.faqTitle;
        const faqModalBody = document.getElementById('faqModalBody');
        if (faqModalBody) {
            faqModalBody.innerHTML = locale.faqHtml || '';
            buildFaqAccordion(faqModalBody);
        }
`,
    '        infoModals.applyInfoModalLocale();\n',
);

body = body.replace(
    /\n    let connectionAttempted = false;\n    const cancelBtn = document\.getElementById\('cancelBtn'\);\n    const retryBtn = document\.getElementById\('retryBtn'\);\n    const detectEnvBtn = document\.getElementById\('detectEnvBtn'\);\n    let activeSessionId = '';\n/,
    '\n    let activeSessionId = \'\';\n',
);

const factoryPrefix = `
    let connection;
    let groupUtils;
    let infoModals;

    connection = createConnection({
        getLocale: () => locale,
        getPlaceholder: () => placeholder,
    });
    connection.bindConnectionEvents();

    groupUtils = createGroupUtils({
        getLocale: () => locale,
        getMessagePlainText: (...a) => messages.getMessagePlainText(...a),
        getLastActiveSessionId: () => lastActiveSessionId,
        bumpSessionIndex: () => sessionMsgCounter++,
        resetSessionIndex: () => { sessionMsgCounter = 0; },
    });

    infoModals = createInfoModals({ getLocale: () => locale });
    infoModals.bindInfoModalEvents();

    const {
        assignSessionIndex,
        reindexSessionIndices,
        requestSessionExport,
    } = groupUtils;

`;

body = body.replace(
    /\n    let logViewer;\n    let inputMode;/,
    factoryPrefix + '\n    let logViewer;\n    let inputMode;',
);

body = body.replace(
    'setConnectionAttempted: (v) => { connectionAttempted = v; },',
    'setConnectionAttempted: (v) => connection.setConnectionAttempted(v),',
);
body = body.replace(
    'updateStatus,',
    'updateStatus: connection.updateStatus,',
);
body = body.replace(
    'buildConnectionErrorPlaceholder,',
    'buildConnectionErrorPlaceholder: connection.buildConnectionErrorPlaceholder,',
);
body = body.replace(
    'bindConnectionErrorActions,',
    'bindConnectionErrorActions: connection.bindConnectionErrorActions,',
);
body = body.replace(
    'downloadSessionMarkdown,',
    'downloadSessionMarkdown,',
);
body = body.replace(
    'setPluginInfo: (msg) => { pluginInfo = msg; },',
    'setPluginInfo: infoModals.setPluginInfo,',
);
body = body.replace(
    'renderAboutContent,',
    'renderAboutContent: infoModals.renderAboutContent,',
);
body = body.replace(
    /openLogModal: logViewer\.openLogModal,\n            renderAboutContent,/,
    'openLogModal: logViewer.openLogModal,\n            renderAboutContent: infoModals.renderAboutContent,',
);
body = body.replace(
    /renderAboutContent,\n            showModal,\n            aboutModal,\n            helpModal,\n            faqModal,/,
    'renderAboutContent: infoModals.renderAboutContent,\n            showModal,\n            aboutModal: infoModals.aboutModal,\n            helpModal: infoModals.helpModal,\n            faqModal: infoModals.faqModal,',
);

fs.writeFileSync(chatAppPath, body);
console.log('Step 8 applied.');
