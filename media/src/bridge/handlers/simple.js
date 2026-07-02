/** @param {Record<string, Function>} deps */
export function createSimpleHandlers(deps) {
    return {
        tokenUsage(msg) {
            deps.updateTokenUsage(msg.used, msg.size);
        },
        newChat() {
            deps.newChat();
        },
        clearChat() {
            deps.clearChat();
        },
        insertInput(msg) {
            deps.insertIntoInput(msg.text || '');
        },
        sessionList(msg) {
            deps.renderSessionTabs(msg.sessions, msg.activeSessionId);
        },
        openLogs() {
            deps.openLogModal();
        },
        openAbout() {
            deps.renderAboutContent();
            deps.showModal(deps.aboutModal);
        },
        openHelp() {
            deps.showModal(deps.helpModal);
        },
        openFaq() {
            deps.showModal(deps.faqModal);
        },
    };
}

