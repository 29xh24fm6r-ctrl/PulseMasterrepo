// lib/intent/classifyVoiceIntent.ts
import type { PulseIntent } from "@/lib/runs/types";

export function classifyVoiceIntent(args: {
    transcript: string;
    context?: any;
}): PulseIntent {
    const t = (args.transcript || "").trim().toLowerCase();

    // Simple v1 deterministic mapping (no LLM yet)
    if (t.includes("contact oracle") || t.includes("run contact")) {
        return { type: "RUN_ORACLE", oracle_id: "contact_oracle_v1", confidence: 0.9 };
    }

    if (t.startsWith("go to ") || t.includes("open settings")) {
        if (t.includes("settings")) return { type: "NAVIGATE", path: "/settings", confidence: 0.8 };
    }

    if (t.includes("remind me")) {
        return { type: "CREATE_REMINDER", content: args.transcript, confidence: 0.7 };
    }

    return { type: "UNKNOWN", confidence: 0.2, reason: "No mapping matched" };
}
