// lib/runtime/previewRuntime.ts

export function previewRuntimeEnvelope(extra?: Record<string, unknown>) {
    return {
        ok: true,
        mode: "preview",
        auth: "disabled",
        safe: true,
        ts: Date.now(),
        ...extra,
    } as const;
}
