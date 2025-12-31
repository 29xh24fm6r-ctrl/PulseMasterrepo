// app/api/capture/route.ts
import { NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity/log";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Simple in-memory store for capture events (resets on server restart)
// In production, this would write to a DB (e.g., Supabase 'events' table)
const CAPTURE_STORE: { id: string; text: string; created_at: string }[] = [];

/**
 * POST /api/capture
 * Body: { text: string }
 * Quick capture for thoughts, tasks, or notes.
 */
export async function POST(req: Request) {
    try {
        const body = await req.json().catch(() => null);

        if (!body || typeof body.text !== "string" || !body.text.trim()) {
            return NextResponse.json(
                { error: "Missing or invalid 'text' field" },
                { status: 400 }
            );
        }

        const newItem = {
            id: `cap_${Date.now()}`,
            text: body.text.trim(),
            created_at: new Date().toISOString(),
        };

        CAPTURE_STORE.unshift(newItem); // Add to local store

        // In a real implementation:
        // await supabase.from('inbox').insert({ content: newItem.text });

        // Log to Activity Feed
        await logActivityEvent({
            source: "capture",
            event_type: "capture.created",
            title: "Captured item",
            detail: typeof body?.text === "string" ? body.text.slice(0, 140) : "New capture",
            payload: { text: body?.text ?? null },
        });

        return NextResponse.json({
            success: true,
            item: newItem,
            store_count: CAPTURE_STORE.length
        });
    } catch (err: any) {
        return NextResponse.json(
            { error: "Capture failed", detail: err?.message || String(err) },
            { status: 500 }
        );
    }
}
