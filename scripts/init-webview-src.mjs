/**
 * One-time extractor: splits media/chat.html into media/src/ source files.
 * Run before Step 1 shell template replaces the monolith HTML.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const htmlPath = path.join(root, 'media', 'chat.html');
const html = fs.readFileSync(htmlPath, 'utf-8');
const lines = html.split(/\r?\n/);

const scriptLineIdx = lines.findIndex((l, i) => i >= 3200 && l.trim() === '<script>');
const closeScriptIdx = lines.findIndex((l, i) => i > scriptLineIdx && l.trim() === '</script>');
const bodyStart = lines.findIndex((l) => l.trim() === '<body>') + 1;

const cssLines = lines.slice(10, 2922);
const bodyLines = lines.slice(bodyStart, scriptLineIdx);

let iifeStart = scriptLineIdx + 1;
while (iifeStart < closeScriptIdx && lines[iifeStart].trim() !== '(function() {') {
    iifeStart++;
}
let iifeCloseLine = closeScriptIdx - 1;
while (iifeCloseLine > iifeStart && lines[iifeCloseLine].trim() !== '})();') {
    iifeCloseLine--;
}
const jsLines = lines.slice(iifeStart + 1, iifeCloseLine);

const stylesDir = path.join(root, 'media', 'src', 'styles');
const srcDir = path.join(root, 'media', 'src');
fs.mkdirSync(stylesDir, { recursive: true });

/** Map file-line numbers to cssLines slice indices (file line 11 => css index 0). */
function cssSlice(fromLine, toLine) {
    return cssLines.slice(fromLine - 11, toLine - 11).join('\n');
}

const cssFiles = {
    'tokens.css': cssSlice(11, 40),
    'toolbar.css': cssSlice(40, 480),
    'faq.css': cssSlice(480, 668),
    'tabs.css': cssSlice(668, 903),
    'messages.css': cssSlice(903, 1739),
    'input.css': cssSlice(1739, 2807),
    'modals.css': cssSlice(2807, 2923),
};

for (const [name, content] of Object.entries(cssFiles)) {
    fs.writeFileSync(path.join(stylesDir, name), content.trimStart() + '\n');
}

fs.writeFileSync(
    path.join(srcDir, 'body.html'),
    bodyLines.join('\n').trimEnd() + '\n',
);

const jsContent = jsLines
    .join('\n')
    .replace(
        'let locale = {{LOCALE_JSON}};',
        'let locale = window.__HERMES_LOCALE__ || {};',
    )
    .replace('{{LOCALE_HELPER}}', '');

fs.writeFileSync(path.join(srcDir, 'chat-app.js'), jsContent);

console.log('Extracted webview sources:');
console.log('  CSS chunks:', Object.keys(cssFiles).length);
console.log('  body.html:', bodyLines.length, 'lines');
console.log('  chat-app.js:', jsLines.length - 1, 'lines');
