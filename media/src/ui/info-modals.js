import { vscode } from '../core/vscode.js';
import { escapeHtml } from '../utils/escape-html.js';
import { showModal, hideModal } from './modal.js';
import { buildFaqAccordion } from '../locale/faq.js';

/** @param {Record<string, Function>} deps */
export function createInfoModals(deps) {
    const aboutModal = document.getElementById('aboutModal');
    const helpModal = document.getElementById('helpModal');
    const faqModal = document.getElementById('faqModal');
    const faqModalBody = document.getElementById('faqModalBody');
    const aboutContent = document.getElementById('aboutContent');
    let pluginInfo = {};

    function renderAboutContent() {
        const locale = deps.getLocale();
        const name = pluginInfo.displayName || 'Rina Hermes ACP';
        const version = pluginInfo.version || '—';
        const publisher = pluginInfo.publisher || '';
        const repo = pluginInfo.repository || '';
        const iconUri = pluginInfo.iconUri || '';
        const logoHtml = iconUri
            ? '<div class="about-brand"><img src="' + escapeHtml(iconUri) + '" alt="' + escapeHtml(name) + '" /></div>'
            : '';
        aboutContent.innerHTML =
            logoHtml +
            '<h3>' + escapeHtml(name) + '</h3>' +
            '<p>' + locale.aboutVersion + ' <code>' + escapeHtml(version) + '</code>' +
            (publisher ? ' · ' + escapeHtml(publisher) : '') + '</p>' +
            '<p>' + locale.aboutDescription + '</p>' +
            '<ul>' +
            '<li>' + escapeHtml(locale.aboutFeatureTabs) + '</li>' +
            '<li>' + escapeHtml(locale.aboutFeaturePickers) + '</li>' +
            '<li>' + escapeHtml(locale.aboutFeatureInsert) + '</li>' +
            '<li>' + escapeHtml(locale.aboutFeatureTools) + '</li>' +
            '</ul>' +
            (repo ? '<p class="dim">' + escapeHtml(locale.repository) + '：<a href="#" data-url="' + escapeHtml(repo) + '">' + escapeHtml(repo) + '</a></p>' : '');
        aboutContent.querySelectorAll('a[data-url]').forEach(function(link) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                vscode.postMessage({ type: 'openExternal', url: link.dataset.url });
            });
        });
    }

    function closeInfoModals() {
        hideModal(aboutModal);
        hideModal(helpModal);
        hideModal(faqModal);
    }

    function applyInfoModalLocale() {
        const locale = deps.getLocale();
        const aboutModalTitle = document.getElementById('aboutModalTitle');
        if (aboutModalTitle) aboutModalTitle.textContent = locale.aboutTitle;
        const helpModalTitle = document.getElementById('helpModalTitle');
        if (helpModalTitle) helpModalTitle.textContent = locale.helpTitle;
        const helpModalBody = document.getElementById('helpModalBody');
        if (helpModalBody) helpModalBody.innerHTML = locale.helpHtml;
        const faqModalTitle = document.getElementById('faqModalTitle');
        if (faqModalTitle) faqModalTitle.textContent = locale.faqTitle;
        if (faqModalBody) {
            faqModalBody.innerHTML = locale.faqHtml || '';
            buildFaqAccordion(faqModalBody);
        }
    }

    function bindInfoModalEvents() {
        document.querySelectorAll('.close-info-modal').forEach(function(btn) {
            btn.addEventListener('click', closeInfoModals);
        });
        aboutModal.addEventListener('click', function(e) {
            if (e.target === aboutModal) closeInfoModals();
        });
        helpModal.addEventListener('click', function(e) {
            if (e.target === helpModal) closeInfoModals();
        });
        faqModal.addEventListener('click', function(e) {
            if (e.target === faqModal) closeInfoModals();
        });
        if (faqModalBody) {
            faqModalBody.addEventListener('toggle', function(e) {
                const item = e.target;
                if (!item.classList || !item.classList.contains('faq-item') || !item.open) {
                    return;
                }
                const list = item.closest('.faq-list');
                if (!list) {
                    return;
                }
                list.querySelectorAll('.faq-item[open]').forEach(function(other) {
                    if (other !== item) {
                        other.open = false;
                    }
                });
            }, true);
            faqModalBody.addEventListener('click', function(e) {
                const link = e.target.closest('a[data-url]');
                if (!link) return;
                e.preventDefault();
                vscode.postMessage({ type: 'openExternal', url: link.dataset.url });
            });
        }
    }

    function setPluginInfo(info) {
        pluginInfo = info || {};
    }

    return {
        aboutModal,
        helpModal,
        faqModal,
        renderAboutContent,
        closeInfoModals,
        applyInfoModalLocale,
        bindInfoModalEvents,
        setPluginInfo,
    };
}
