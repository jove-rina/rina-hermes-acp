export type LogLevel = 'error' | 'warning';

/** Classify a log line for webview display. Returns null for non ERROR/WARNING lines. */
export function classifyLogLevel(line: string): LogLevel | null {
    const text = line.toUpperCase();
    if (
        /\bERROR\b/.test(text) ||
        /\bFATAL\b/.test(text) ||
        /\bFAILED\b/.test(text) ||
        /\bEXCEPTION\b/.test(text) ||
        /PROCESS EXITED/.test(text) ||
        /CONNECTION LOST/.test(text)
    ) {
        return 'error';
    }
    if (/\bWARN(?:ING)?\b/.test(text)) {
        return 'warning';
    }
    return null;
}
