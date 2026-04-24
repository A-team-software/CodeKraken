export function buildCloneUrl(raw: string, token?: string) {
    if (!token) return raw;
    try {
        const u = new URL(raw.replace(/\.git$/, ""));
        if (u.hostname !== "github.com") return raw;
        u.username = "x-access-token";
        u.password = token;
        return u.toString();
    } catch {
        return raw;
    }
}
