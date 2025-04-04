export interface CacheInterface {
    get: (cachedKey: string) => Promise<string | null>;
    set: (cacheKey: string, value: string | null, expiresIn: number) => Promise<string | null>;
    del: (cacheKey: string) => Promise<number>;
    exists: (cacheKey: string) => Promise<number>;
    flushAll: () => Promise<string | null>;
    ping: () => Promise<string | null>;
    getKeys: (pattern: string) => Promise<string[]>;
    getAll: (pattern: string) => Promise<(string | null)[]>;
    getAllKeys: () => Promise<string[]>;
    getAllValues: () => Promise<(string | null)[]>;
    fromCacheToType: <T>(fn: (key: string) => string | null, key: string) => T | null;
}
