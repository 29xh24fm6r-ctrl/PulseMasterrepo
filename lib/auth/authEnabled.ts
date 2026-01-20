import { isCanonicalHost } from "@/lib/auth/canonicalHosts";

export function getAuthEnabledClient(): boolean {
    if (typeof window === "undefined") return false;
    const hostname = window.location.hostname || "";
    const hasKey = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    return isCanonicalHost(hostname) && hasKey;
}
