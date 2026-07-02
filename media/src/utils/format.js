export function formatTokenCount(n) {
    const value = Number(n) || 0;
    if (value >= 1_000_000) {
        return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    }
    if (value >= 10_000) {
        return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'k';
    }
    if (value >= 1_000) {
        return (value / 1_000).toFixed(1) + 'k';
    }
    return String(value);
}
