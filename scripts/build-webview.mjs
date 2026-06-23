/**
 * Build webview assets: concat CSS → media/chat.css, bundle JS → media/chat.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, context } from 'esbuild';

const root = path.join(fileURLToPath(new URL('.', import.meta.url)), '..');
const media = path.join(root, 'media');
const stylesDir = path.join(media, 'src', 'styles');
const watch = process.argv.includes('--watch');

const cssOrder = [
    'tokens.css',
    'toolbar.css',
    'faq.css',
    'tabs.css',
    'messages.css',
    'input.css',
    'modals.css',
];

function writeStaticAssets() {
    const cssParts = cssOrder.map((file) => {
        const filePath = path.join(stylesDir, file);
        if (!fs.existsSync(filePath)) {
            throw new Error(`Missing stylesheet: ${filePath}. Run: npm run init:webview`);
        }
        return fs.readFileSync(filePath, 'utf-8');
    });
    fs.writeFileSync(path.join(media, 'chat.css'), cssParts.join('\n'));

    const bodyHtml = fs.readFileSync(path.join(media, 'src', 'body.html'), 'utf-8');
    const shellTemplate = fs.readFileSync(path.join(media, 'chat.html.template'), 'utf-8');
    fs.writeFileSync(
        path.join(media, 'chat.html'),
        shellTemplate.replace('{{BODY}}', bodyHtml.trimEnd()),
    );
}

writeStaticAssets();

const buildOptions = {
    entryPoints: [path.join(media, 'src', 'main.ts')],
    outfile: path.join(media, 'chat.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['es2020'],
    logLevel: 'info',
};

if (watch) {
    const ctx = await context(buildOptions);
    await ctx.watch();
    console.log('Watching webview JS (media/src → media/chat.js)...');
} else {
    await build(buildOptions);
    console.log('Built media/chat.css, media/chat.html, and media/chat.js');
}
