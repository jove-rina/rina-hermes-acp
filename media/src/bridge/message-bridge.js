/** @param {Record<string, (msg: Record<string, unknown>) => void>} handlers */
export function initMessageBridge(handlers) {
    window.addEventListener('message', function(event) {
        const msg = event.data;
        const handler = handlers[msg.type];
        if (handler) handler(msg);
    });
}

