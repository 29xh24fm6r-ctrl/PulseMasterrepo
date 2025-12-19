import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";
import { IntelSourceRow, pickCapturedAt, pickContent, safeSourceType, looksLikeMissingColumn } from "@/lib/crm/intel-schema";

export const dynamic = "force-dynamic";

/**
 * POST rebuild intel
 * Loads last 25 sources, creates markdown brief, upserts into crm_contact_intel
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ personId: string }> | { personId: string } }
) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolvedParams = params instanceof Promise ? await params : params;
  const personId = resolvedParams.personId;
  if (!personId) return NextResponse.json({ error: "Missing personId" }, { status: 400 });

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

  // Attempt 1: order by captured_at (new schema)
  let sources: IntelSourceRow[] = [];
  {
    const { data, error } = await supabaseAdmin
      .from("crm_contact_intel_sources")
      .select("*")
      .eq("contact_id", canonicalId)
      .eq("owner_user_id", clerkUserId)
      .order("captured_at", { ascending: false })
      .limit(25);

    if (!error) {
      sources = (data ?? []) as IntelSourceRow[];
    } else if (!looksLikeMissingColumn(error.message, "captured_at")) {
      if (looksLikeMissingColumn(error.message, "owner_user_id")) {
        return NextResponse.json(
          { error: `DB schema missing owner_user_id on crm_contact_intel_sources. Run the migration to add it. (${error.message})` },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message || "Failed to load sources" }, { status: 500 });
    }
  }

  // Attempt 2: fallback order by created_at (older schema)
  if (!sources.length) {
    const { data, error } = await supabaseAdmin
      .from("crm_contact_intel_sources")
      .select("*")
      .eq("contact_id", canonicalId)
      .eq("owner_user_id", clerkUserId)
      .order("created_at", { ascending: false })
      .limit(25);

    if (error) {
      if (looksLikeMissingColumn(error.message, "owner_user_id")) {
        return NextResponse.json(
          { error: `DB schema missing owner_user_id on crm_contact_intel_sources. Run the migration to add it. (${error.message})` },
          { status: 500 }
        );
      }
      return NextResponse.json({ error: error.message || "Failed to load sources" }, { status: 500 });
    }
    sources = (data ?? []) as IntelSourceRow[];
  }

  // Build markdown brief
  const briefParts: string[] = [];
  briefParts.push(`# Contact Intelligence Brief\n`);
  briefParts.push(`Generated from ${sources.length} source(s)\n\n`);

  if (sources.length) {
    briefParts.push(`## Sources\n\n`);
    for (const s of sources) {
      const type = safeSourceType(s);
      const content = pickContent(s);
      const dt = pickCapturedAt(s);
      const captured = dt ? new Date(dt).toLocaleDateString() : "unknown date";

      briefParts.push(`### ${type} (${captured})\n`);
      if (content) {
        const clipped = content.length > 700 ? content.slice(0, 700) + "…" : content;
        briefParts.push(`${clipped}\n\n`);
      } else {
        briefParts.push(`(no content)\n\n`);
      }
    }
  } else {
    briefParts.push(`No sources available yet.\n`);
  }

  const briefMd = briefParts.join("");
  const lastTouch = new Date().toISOString();

  // Upsert intel (must include owner_user_id)
  const { data: intel, error: upsertError } = await supabaseAdmin
    .from("crm_contact_intel")
    .upsert(
      {
        contact_id: canonicalId,
        owner_user_id: clerkUserId,
        brief_md: briefMd,
        relationship: { last_touch: lastTouch },
        version: 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "contact_id,owner_user_id" }
    )
    .select()
    .single();

  if (upsertError) {
    if (looksLikeMissingColumn(upsertError.message, "owner_user_id")) {
      return NextResponse.json(
        { error: `DB schema missing owner_user_id on crm_contact_intel. Add column + index. (${upsertError.message})` },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: upsertError.message || "Failed to rebuild intel" }, { status: 500 });
  }

  return NextResponse.json({ success: true, intel });
}
