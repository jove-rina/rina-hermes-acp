/** @returns {Record<string, string>} */
export function getLocale() {
    return window.__HERMES_LOCALE__ || {};
}

/** @param {Record<string, string>} next */
export function setLocale(next) {
    window.__HERMES_LOCALE__ = next;
}

