export function sanitize(obj: any): any {
    if (!obj) return obj;
    const str = JSON.stringify(obj);
    // Basic redactor for known sensitive keys (rudimentary)
    // Real impl would use a library or recursive walk
    return JSON.parse(str.replace(/"(password|token|secret|key|cvv|pan)":\s*"[^"]+"/gi, '"$1": "[REDACTED]"'));
}
