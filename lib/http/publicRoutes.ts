// lib/http/publicRoutes.ts

export const PUBLIC_PATH_PREFIXES: string[] = [
    "/_next/static",
    "/_next/image",
    "/icons",
    "/images",
    "/assets",
];

export const PUBLIC_EXACT_PATHS: string[] = [
    "/manifest.json",
    "/robots.txt",
    "/sitemap.xml",
    "/favicon.ico",
];

export const PUBLIC_PATH_REGEXES: RegExp[] = [
    /^\/apple-touch-icon.*\.png$/i,
    /^\/android-chrome-.*\.png$/i,
    /^\/favicon-.*\.png$/i,
];

export function isPublicPath(pathname: string): boolean {
    if (PUBLIC_EXACT_PATHS.includes(pathname)) return true;
    if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
    if (PUBLIC_PATH_REGEXES.some((r) => r.test(pathname))) return true;
    return false;
}
