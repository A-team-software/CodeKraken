export function truncate(text: string, max = 24_000) {
    if (!text) return text;
    return text.length > max
        ? text.slice(0, max) + `\n... (truncated ${text.length - max} chars)`
        : text;
}
