// EDGE-SAFE ONLY — no Node imports

const PUBLIC_ASSET_PATHS = new Set([
    "/manifest.json",
    "/favicon.ico",
    "/robots.txt",
    "/sitemap.xml",
]);

export function isPublicAssetPath(pathname: string) {
    return PUBLIC_ASSET_PATHS.has(pathname);
}
