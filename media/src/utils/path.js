export function basenameFromPath(filePath) {
    if (!filePath) return 'hermes';
    const parts = filePath.split(/[/\\]/).filter(Boolean);
    return parts.length ? parts[parts.length - 1] : 'hermes';
}

