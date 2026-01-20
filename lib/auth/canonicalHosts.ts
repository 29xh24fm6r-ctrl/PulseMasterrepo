// lib/auth/canonicalHosts.ts
export const CANONICAL_HOSTS = new Set([
    "localhost",
    "127.0.0.1",
    "pulselifeos.com",
    "www.pulselifeos.com",
    "app.pulselifeos.com",
]);

export function isCanonicalHost(hostname: string): boolean {
    if (!hostname) return false;
    if (CANONICAL_HOSTS.has(hostname)) return true;

    // Allow localhost with port-like hostname patterns are already handled by browser hostname stripping ports,
    // but keep a conservative fallback in case something odd passes through.
    if (hostname.endsWith(".localhost")) return true;

    return false;
}

export function isVercelPreviewHost(hostname: string): boolean {
    // Preview URLs typically end with .vercel.app
    return !!hostname && hostname.endsWith(".vercel.app");
}
