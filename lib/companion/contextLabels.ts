import { APP_ROUTES } from "@/lib/appRoutes";

export function getContextLabel(pathname: string): string {
    if (!pathname || pathname === "/") return "Viewing: Home";

    // 1. Exact match
    const exact = APP_ROUTES.find(r => r.href === pathname);
    if (exact) return `Viewing: ${exact.label}`;

    // 2. Prefix match (for sub-routes like /deals/123)
    // Sort by length desc to match longest prefix first
    const sortedRoutes = [...APP_ROUTES].sort((a, b) => b.href.length - a.href.length);
    const prefix = sortedRoutes.find(r => pathname.startsWith(r.href) && r.href !== "/");

    if (prefix) return `Viewing: ${prefix.label}`;

    // 3. Fallback: Capitalize first segment
    const segment = pathname.split("/")[1];
    if (segment) {
        return `Viewing: ${segment.charAt(0).toUpperCase() + segment.slice(1)}`;
    }

    return "Viewing: Current Screen";
}
