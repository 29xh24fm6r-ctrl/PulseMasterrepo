import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";
import { looksLikeMissingColumn } from "@/lib/crm/intel-schema";

export const dynamic = "force-dynamic";

/**
 * POST ingest intel source
 * Body: { content: string, source_type?: string }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ personId: string }> | { personId: string } }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const resolvedParams = params instanceof Promise ? await params : params;
  const personId = resolvedParams.personId;

  if (!personId) {
    return NextResponse.json({ error: "Missing personId" }, { status: 400 });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const content = body?.content;
  const source_type = body?.source_type;

  if (!content || typeof content !== "string") {
    return NextResponse.json({ error: "Missing or invalid content" }, { status: 400 });
  }

  // Resolve canonical contact ID
  let canonicalId = personId;
  try {
    const resolved = await resolveCanonicalContactId(personId, clerkUserId);
    canonicalId = resolved.canonicalId;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Contact not found" },
      { status: 404 }
    );
  }

    // --- Build a payload that matches the ACTUAL crm_contact_intel_sources schema ---
    const nowIso = new Date().toISOString();

    const normalizedSourceType =
      typeof source_type === "string" && source_type.trim()
        ? source_type.trim()
        : "manual_note";
  
    // Manual sources need a synthetic URL because source_url is NOT NULL
    const syntheticUrl =
      normalizedSourceType === "manual_note" || normalizedSourceType === "user_added"
        ? `manual://note/${canonicalId}/${crypto.randomUUID()}`
        : `manual://source/${canonicalId}/${crypto.randomUUID()}`;
  
    // Optional: keep title short-ish
    const title =
      normalizedSourceType === "manual_note" ? "Manual note" : `Source: ${normalizedSourceType}`;
  
    // This is the REAL insert shape for crm_contact_intel_sources
    const payloadBase: any = {
      contact_id: canonicalId,
      owner_user_id: clerkUserId, // nullable in your schema, but good to set
      source_type: normalizedSourceType,
      source_url: syntheticUrl,
      source_domain: "manual",
      title,
      snippet: content, // <-- store "content" here
      match_score: 100,
      match_evidence: { type: normalizedSourceType, added_by: clerkUserId },
      seen_at: nowIso,
    };
  
    // Try a few variants in order, so we survive schema drift (missing cols, older tables, etc.)
    const attempts: any[] = [
      { ...payloadBase, captured_at: nowIso }, // new schema (captured_at NOT NULL)
      payloadBase, // older schema (no captured_at)
      // if seen_at is missing in an older schema
      (() => {
        const { seen_at, ...rest } = payloadBase;
        return { ...rest, captured_at: nowIso };
      })(),
      (() => {
        const { seen_at, ...rest } = payloadBase;
        return rest;
      })(),
    ];
  
    let lastError: any = null;
  
    for (const attempt of attempts) {
      const { data, error } = await supabaseAdmin
        .from("crm_contact_intel_sources")
        .insert(attempt)
        .select()
        .single();
  
      if (!error) {
        return NextResponse.json({ success: true, source: data });
      }
  
      lastError = error;
  
      // If it's a "missing column" error, keep trying other shapes.
      // If it's something else (RLS, FK, etc.), bail.
      const msg = error.message || "";
      const missingColumn =
        msg.includes("Could not find the") ||
        msg.includes("does not exist") ||
        msg.includes("schema cache");
  
      if (!missingColumn) break;
    }
  
    return NextResponse.json(
      { error: lastError?.message || "Failed to ingest source" },
      { status: 500 }
    );
}
