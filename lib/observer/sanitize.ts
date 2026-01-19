const MAX_STR = 120;

export function sanitizeText(raw: unknown) {
    if (typeof raw !== "string") return "";
    // Strip emails, long numbers, and anything that looks like a secret-ish token
    let s = raw;
    s = s.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email]");
    s = s.replace(/\b\d{6,}\b/g, "[num]");
    s = s.replace(/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]+\b/g, "[key]");
    s = s.replace(/[A-Za-z0-9_-]{28,}/g, "[token]");
    s = s.trim();
    if (s.length > MAX_STR) s = s.slice(0, MAX_STR) + "…";
    return s;
}

export function safeTargetDescriptor(t: EventTarget | null) {
    if (!t || !(t instanceof HTMLElement)) return "unknown";
    const parts: string[] = [t.tagName.toLowerCase()];
    const testId = t.getAttribute("data-testid");
    if (testId) parts.push(`[data-testid="${sanitizeText(testId)}"]`);
    const role = t.getAttribute("role");
    if (role) parts.push(`[role="${sanitizeText(role)}"]`);
    const aria = t.getAttribute("aria-label");
    if (aria) parts.push(`[aria-label="${sanitizeText(aria)}"]`);
    return parts.join("");
}
