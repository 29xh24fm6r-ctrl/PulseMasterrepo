// lib/intent/classifyVoiceIntent.ts
import type { PulseIntent } from "@/lib/runs/types";

export function classifyVoiceIntent(args: {
    transcript: string;
    context?: any;
}): PulseIntent {
    const t = (args.transcript || "").trim().toLowerCase();

    // Commerce Mappings
    if (t.includes("paella") || t.includes("order food")) {
        return {
            type: "COMMERCE_REQUEST",
            confidence: 0.95,
            request_text: args.transcript
        }
    }

    // Purchase Mappings
    if (t.includes("order subway")) {
        return {
            type: "PURCHASE_PREPARE",
            confidence: 1.0,
            merchant_key: "subway",
            category: "food",
            amount_cents: 1500 // $15 estimate
        };
    }

    if (t.includes("flowers") && t.includes("sebrina")) {
        return {
            type: "PURCHASE_PREPARE",
            confidence: 1.0,
            merchant_key: "1800flowers",
            category: "gifts",
            amount_cents: 5500
        }
    }

    // Existing Mappings
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
