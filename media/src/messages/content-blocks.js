import { inputEl } from '../core/dom-refs.js';
import { escapeHtml } from '../utils/escape-html.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { COPY_ICON_SVG, CHEVRON_DOWN_SVG } from '../ui/icons.js';

/** @param {Record<string, Function>} deps */
export function createContentBlocks(deps) {
    function closeInsertDropdowns(except) {
        document.querySelectorAll('.insert-dropdown.is-open').forEach(function(dropdown) {
            if (except && dropdown === except) return;
            dropdown.classList.remove('is-open');
        });
    }

    function createInsertDropdown(getText) {
        const locale = deps.getLocale();
        const dropdown = document.createElement('div');
        dropdown.className = 'insert-dropdown';

        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'block-btn insert-toggle';
        toggle.innerHTML = escapeHtml(locale.insertMenu || locale.insert) + CHEVRON_DOWN_SVG;
        toggle.addEventListener('click', function(e) {
            e.stopPropagation();
            const open = dropdown.classList.contains('is-open');
            closeInsertDropdowns();
            dropdown.classList.toggle('is-open', !open);
        });

        const menu = document.createElement('div');
        menu.className = 'insert-dropdown-menu';

        const inputBtn = document.createElement('button');
        inputBtn.type = 'button';
        inputBtn.textContent = locale.insertToInput;
        inputBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeInsertDropdowns();
            if (inputEl.disabled) return;
            deps.appendToInput(getText());
        });

        const editorBtn = document.createElement('button');
        editorBtn.type = 'button';
        editorBtn.textContent = locale.insertToEditor;
        editorBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            closeInsertDropdowns();
            deps.insertToEditor(getText());
        });

        menu.appendChild(inputBtn);
        menu.appendChild(editorBtn);
        dropdown.appendChild(toggle);
        dropdown.appendChild(menu);
        return dropdown;
    }

    function addBlockActions(container, getText) {
        const locale = deps.getLocale();
        if (container.querySelector('.block-actions')) return;
        const actions = document.createElement('div');
        actions.className = 'block-actions';

        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.className = 'block-btn';
        copyBtn.title = locale.copy;
        copyBtn.innerHTML = COPY_ICON_SVG;
        copyBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            copyToClipboard(getText()).then(function() {
                copyBtn.classList.add('copied');
                copyBtn.title = locale.copied;
                setTimeout(function() {
                    copyBtn.classList.remove('copied');
                    copyBtn.title = locale.copy;
                }, 1500);
            });
        });

        actions.appendChild(copyBtn);
        actions.appendChild(createInsertDropdown(getText));
        container.appendChild(actions);
    }

    function tableToMarkdown(table) {
        const rows = [];
        table.querySelectorAll('tr').forEach(function(tr) {
            const cells = [];
            tr.querySelectorAll('th, td').forEach(function(cell) {
                cells.push((cell.textContent || '').replace(/\|/g, '\\|').replace(/\n/g, ' ').trim());
            });
            if (cells.length) rows.push(cells);
        });
        if (!rows.length) return '';
        const widths = rows[0].map(function(_, index) {
            return Math.max.apply(null, rows.map(function(row) {
                return (row[index] || '').length;
            }));
        });
        const formatRow = function(row) {
            return '| ' + row.map(function(cell, index) {
                return (cell || '').padEnd(widths[index], ' ');
            }).join(' | ') + ' |';
        };
        const header = formatRow(rows[0]);
        const divider = '| ' + widths.map(function(width) {
            return '-'.repeat(Math.max(3, width));
        }).join(' | ') + ' |';
        const body = rows.slice(1).map(formatRow);
        return [header, divider].concat(body).join('\n');
    }

    function setupTableBlock(table) {
        if (!table || table.dataset.blockReady) return;
        table.dataset.blockReady = '1';
        const wrap = document.createElement('div');
        wrap.className = 'block-actions-wrap';
        table.parentNode.insertBefore(wrap, table);
        wrap.appendChild(table);
        addBlockActions(wrap, function() {
            return tableToMarkdown(table);
        });
    }

    function setupCodeBlock(codeBlock) {
        const pre = codeBlock.closest('pre');
        if (!pre || pre.dataset.blockReady) return;
        pre.dataset.blockReady = '1';
        hljs.highlightElement(codeBlock);
        const lang = (codeBlock.className.match(/language-(\w+)/) || [])[1] || '';
        const wrap = document.createElement('div');
        wrap.className = 'block-actions-wrap';
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);
        addBlockActions(wrap, function() {
            const code = codeBlock.textContent || '';
            if (!lang) return code;
            return '```' + lang + '\n' + code + '\n```';
        });
    }

    function setupContentBlocks(container) {
        if (!container) return;
        container.querySelectorAll('pre code').forEach(function(block) {
            setupCodeBlock(block);
        });
        container.querySelectorAll('table').forEach(function(table) {
            setupTableBlock(table);
        });
    }

    return { setupContentBlocks, closeInsertDropdowns };
}
