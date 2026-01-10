import { NextRequest, NextResponse } from "next/server";
import { routeIntent } from "@/lib/intelligence/intent-router";

export async function POST(req: NextRequest) {
    try {
        const { query } = await req.json();

        if (!query) {
            return NextResponse.json({ error: "Query required" }, { status: 400 });
        }

        // 1. Parse Intent (The "Breath")
        const intent = await routeIntent(query);

        // 2. Log Telemetry (Optional - for learning)
        console.log(`[Pulse] Intent Parsed: ${query} -> ${intent.type}`);

        return NextResponse.json({ intent });

    } catch (error) {
        console.error("[Pulse] Intent Error:", error);
        return NextResponse.json({ error: "Failed to process intent" }, { status: 500 });
    }
}
