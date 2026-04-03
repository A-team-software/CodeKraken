export function createSessionId() {
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
