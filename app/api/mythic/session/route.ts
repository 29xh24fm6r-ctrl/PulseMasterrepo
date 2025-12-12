// app/api/mythic/session/route.ts

import { NextResponse } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { getActiveArc, saveMythicSession, updateArcFromExtraction } from "@/lib/mythic/engine";
import { createDefaultArc } from "@/lib/mythic/createDefaultArc";
import { extractMythicArtifacts } from "@/lib/mythic/extract";

export async function POST(req: Request) {
  try {
    const userId = await requireClerkUserId();
    const body = await req.json();

    // Validate transcript
    if (!body.transcript || body.transcript.trim().length === 0) {
      return NextResponse.json(
        { ok: false, error: "Transcript is required" },
        { status: 400 }
      );
    }

    // Get or create active arc
    let arc = await getActiveArc(userId);
    if (!arc) {
      arc = await createDefaultArc(userId);
    }

    const sessionType = body.sessionType ?? "arc_deepen";

    // Extract artifacts if not provided and transcript exists
    let extracted = body.extracted ?? null;
    if (!extracted && body.transcript) {
      const extractedData = await extractMythicArtifacts(userId, body.transcript);
      if (extractedData) {
        extracted = extractedData;
      }
    }

    // Determine summary
    const summary =
      body.summary ||
      extracted?.summary ||
      null;

    // Determine canon
    const canon = body.canon ?? {
      title: extracted?.canon_title || undefined,
      content: extracted?.summary || undefined,
      tags: ["mythic", sessionType],
    };

    // Determine quests (prioritize extraction over body)
    const quests =
      (extracted && extracted.quests && extracted.quests.length > 0)
        ? extracted.quests
        : body.quests ?? [];

    // Save session
    const session = await saveMythicSession({
      userId,
      arcId: arc.id,
      sessionType,
      transcript: body.transcript,
      summary,
      extracted: extracted || {},
      canon,
      quests,
      rituals: body.rituals ?? [],
    });

    // Update arc if extraction present
    if (extracted) {
      await updateArcFromExtraction(userId, arc.id, extracted);
    }

    return NextResponse.json({ ok: true, session, extracted: extracted || null });
  } catch (err: any) {
    console.error("[Mythic Session API] Error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to save session" },
      { status: 500 }
    );
  }
}
