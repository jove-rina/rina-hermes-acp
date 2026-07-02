export function renderMarkdown(text) {
    const html = marked.parse(text);
    if (typeof DOMPurify !== 'undefined') {
        return DOMPurify.sanitize(html, {
            USE_PROFILES: { html: true },
            ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|file):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        });
    }
    const div = document.createElement('div');
    div.innerHTML = html;
    div.querySelectorAll('*').forEach(function(n) {
        if (!n.attributes) return;
        for (let i = n.attributes.length - 1; i >= 0; i--) {
            const attr = n.attributes[i];
            if (attr.name.startsWith('on') || (attr.name === 'href' && attr.value.toLowerCase().startsWith('javascript:'))) {
                n.removeAttribute(attr.name);
            }
        }
    });
    return div.innerHTML;
}
