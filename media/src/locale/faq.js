export function buildFaqAccordion(container) {
    if (!container || container.querySelector('.faq-list')) {
        return;
    }
    const nodes = Array.from(container.childNodes);
    const wrapper = document.createElement('div');
    wrapper.className = 'faq-list';
    let i = 0;
    while (i < nodes.length) {
        const node = nodes[i];
        if (node.nodeType === 1 && node.tagName === 'H3') {
            const details = document.createElement('details');
            details.className = 'faq-item';
            if (wrapper.childElementCount === 0) {
                details.open = true;
            }
            const summary = document.createElement('summary');
            summary.className = 'faq-summary';
            summary.textContent = node.textContent;
            const body = document.createElement('div');
            body.className = 'faq-body';
            i += 1;
            while (i < nodes.length && !(nodes[i].nodeType === 1 && nodes[i].tagName === 'H3')) {
                body.appendChild(nodes[i]);
                i += 1;
            }
            details.appendChild(summary);
            details.appendChild(body);
            wrapper.appendChild(details);
        } else if (node.nodeType === 3 && !node.textContent.trim()) {
            i += 1;
        } else {
            i += 1;
        }
    }
    if (wrapper.childElementCount > 0) {
        container.textContent = '';
        container.appendChild(wrapper);
    }
}
