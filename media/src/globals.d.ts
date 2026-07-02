/** VS Code webview globals injected at runtime. */
declare function acquireVsCodeApi(): {
    postMessage(message: unknown): void;
    getState(): unknown;
    setState(state: unknown): void;
};

/** Injected via {{LOCALE_HELPER}} in chat.html before chat.js loads. */
declare function localeText(key: string, ...args: (string | number)[]): string;

interface Window {
    __HERMES_LOCALE__?: Record<string, string>;
}
