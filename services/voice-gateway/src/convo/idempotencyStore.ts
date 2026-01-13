type Entry = { expiresAtMs: number };

export class IdempotencyStore {
    private readonly map = new Map<string, Entry>();
    private readonly ttlMs: number;

    constructor(ttlSeconds: number) {
        this.ttlMs = Math.max(60, ttlSeconds) * 1000;
    }

    has(key: string): boolean {
        this.gc();
        const e = this.map.get(key);
        if (!e) return false;
        if (Date.now() > e.expiresAtMs) {
            this.map.delete(key);
            return false;
        }
        return true;
    }

    put(key: string): void {
        this.gc();
        this.map.set(key, { expiresAtMs: Date.now() + this.ttlMs });
    }

    private gc(): void {
        const now = Date.now();
        for (const [k, v] of this.map.entries()) {
            if (now > v.expiresAtMs) this.map.delete(k);
        }
    }
}
