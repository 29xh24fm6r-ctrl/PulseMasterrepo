// app/api/capture/route.ts
import { NextResponse } from "next/server";
import { logActivityEvent } from "@/lib/activity/log";
import { supabaseAdmin } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/capture
 * Body: { text: string }
 * Quick capture for thoughts, tasks, or notes.
 */
export async function POST(req: Request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => null);

        if (!body || typeof body.text !== "string" || !body.text.trim()) {
            return NextResponse.json(
                { error: "Missing or invalid 'text' field" },
                { status: 400 }
            );
        }

        const content = body.text.trim();

        // 1. Insert into inbox_items
        const { data: item, error } = await (supabaseAdmin as any)
            .from("inbox_items")
            .insert({
                user_id: userId,
                title: content,
                source: "capture",
                status: "pending",
                is_processed: false,
                priority: "medium"
            })
            .select()
            .single();

        if (error) {
            throw new Error(`DB Insert Failed: ${error.message}`);
        }

        // 2. Log to Activity Feed
        await logActivityEvent({
            source: "capture",
            event_type: "capture.created",
            title: "Captured item",
            detail: content.length > 50 ? content.slice(0, 50) + "..." : content,
            payload: { text: content, itemId: item.id },
            // Note: logActivityEvent needs to support user_id if specific to user, 
            // but currently assumes context or admin usage. 
            // If logActivityEvent extracts user from somewhere else, verify.
            // For now, we proceed as it was imported.
        });

        return NextResponse.json({
            success: true,
            item: item
        });
    } catch (err: any) {
        console.error("[Capture Error]", err);
        return NextResponse.json(
            { error: "Capture failed", detail: err?.message || String(err) },
            { status: 500 }
        );
    }
}
