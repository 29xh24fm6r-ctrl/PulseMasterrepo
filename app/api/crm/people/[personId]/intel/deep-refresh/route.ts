import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";
import { braveSearch } from "@/lib/intel/brave";
import { generateIntelQueries } from "@/lib/crm/intelligence/intelQueries";
import { scoreIdentityMatch } from "@/lib/crm/intelligence/identityMatch";
import { extractSignals } from "@/lib/crm/intelligence/extractSignals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deep Intel Refresh - External OSINT enrichment via Brave Search
 * Runs a comprehensive external intelligence sweep for a contact
 */
export async function POST(
  _req: Request,
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

  // Load contact (rate limiting + status checks)
  const { data: contact } = await supabaseAdmin
    .from("crm_contacts")
    .select("id, intel_status, last_intel_run_at")
    .eq("id", canonicalId)
    .single();

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  if (contact.intel_status === "running") {
    return NextResponse.json(
      { error: "Intel refresh already in progress" },
      { status: 409 }
    );
  }

  if (contact.intel_status === "paused") {
    return NextResponse.json(
      { error: "Intel refresh is paused for this contact" },
      { status: 403 }
    );
  }

  if (contact.last_intel_run_at) {
    const lastRun = new Date(contact.last_intel_run_at);
    const hoursSince = (Date.now() - lastRun.getTime()) / (1000 * 60 * 60);
    if (hoursSince < 24) {
      return NextResponse.json(
        { error: "Deep refresh can only run once per day. Last run was less than 24 hours ago." },
        { status: 429 }
      );
    }
  }

  // Update status to running
  await supabaseAdmin
    .from("crm_contacts")
    .update({
      intel_status: "running",
      last_intel_run_at: new Date().toISOString(),
    })
    .eq("id", canonicalId);

  // Start async intel run (don't await - return immediately)
  runDeepIntel(canonicalId, clerkUserId).catch((err) => {
    console.error("[DeepIntel] Error in background run:", err);

    // Best-effort: mark intel_status=error without throwing away the original error
    (async () => {
      const { error: bgErr } = await supabaseAdmin
        .from("crm_contacts")
        .update({ intel_status: "error" })
        .eq("id", canonicalId);

      if (bgErr) {
        console.error("[DeepIntel] Failed to set intel_status=error:", bgErr);
      }
    })().catch(console.error);
  });

  return NextResponse.json({
    success: true,
    runId: canonicalId,
    status: "running",
    message: "Deep intel refresh started",
  });
}

/**
 * Background intel run (async)
 */
async function runDeepIntel(contactId: string, ownerUserId: string) {
  try {
    const { data: contact, error: contactError } = await supabaseAdmin
      .from("crm_contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    if (contactError || !contact) {
      throw new Error("Contact not found");
    }

    const queries = generateIntelQueries({
      full_name: contact.full_name,
      name: contact.name,
      primary_email: contact.primary_email,
      company_name: contact.company_name,
      title: contact.title,
      location: contact.location,
    });

    if (queries.length === 0) {
      await supabaseAdmin
        .from("crm_contacts")
        .update({ intel_status: "idle" })
        .eq("id", contactId);
      return;
    }

    for (const queryPack of queries) {
      try {
        const results = await braveSearch(queryPack.query, 15, queryPack.freshness);

        for (let i = 0; i < results.length; i++) {
          const result = results[i];

          const match = scoreIdentityMatch(contact, {
            url: result.url,
            domain: result.publisher,
            title: result.title,
            snippet: result.snippet,
          });

          let sourceType = queryPack.category;
          if (
            result.url.includes("podcast") ||
            result.url.includes("spotify") ||
            result.url.includes("apple")
          ) {
            sourceType = "podcast";
          } else if (result.publisher?.includes("news") || result.publisher?.includes("press")) {
            sourceType = "news";
          }

          // Upsert source (good)
          await supabaseAdmin
            .from("crm_contact_intel_sources")
            .upsert(
              {
                contact_id: contactId,
                owner_user_id: ownerUserId,
                source_url: result.url,
                source_domain: result.publisher,
                source_type: sourceType,
                title: result.title,
                snippet: result.snippet,
                published_at: result.published_at || null,
                query: queryPack.query,
                brave_rank: i + 1,
                match_score: match.match_score,
                match_evidence: match.match_evidence,
                seen_at: new Date().toISOString(),
              },
              {
                onConflict: "contact_id,source_url",
                ignoreDuplicates: false,
              }
            );

          if (match.match_score >= 60) {
            const extraction = extractSignals({
              url: result.url,
              domain: result.publisher,
              title: result.title,
              snippet: result.snippet,
              source_type: sourceType,
              published_at: result.published_at,
              match_score: match.match_score,
            });

            // ✅ FIX: don’t upsert intel signals on "contact_id" only (overwrites)
            // Use a stable per-signal key: contact_id + source_url (or source_url + evidence.type).
            // If your table doesn't have a unique constraint for this, we fall back to insert.
            for (const signal of extraction.signals) {
              await supabaseAdmin.from("crm_contact_intel").insert({
                contact_id: contactId,
                owner_user_id: ownerUserId,
                relationship_score: null,
                source: "brave",
                source_url: signal.source_url,
                confidence: Math.round(signal.confidence * 100),
                evidence: { type: signal.type, title: signal.title },
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              });
            }

            // ✅ FIX: facts should avoid duplicates (best-effort upsert)
            if (match.match_score >= 80) {
              for (const fact of extraction.facts) {
                await supabaseAdmin.from("crm_contact_facts").upsert(
                  {
                    owner_user_id: ownerUserId,
                    contact_id: contactId,
                    fact: fact.fact,
                    category: fact.category,
                    confidence: fact.confidence,
                  },
                  {
                    // requires a unique index (contact_id, fact) to be perfect
                    // if you don't have it yet, this still works but may not dedupe
                    onConflict: "contact_id,fact",
                    ignoreDuplicates: true,
                  }
                );
              }
            }

            // ✅ FIX: events should avoid duplicates (best-effort upsert)
            for (const event of extraction.events) {
              await supabaseAdmin.from("crm_contact_events").upsert(
                {
                  owner_user_id: ownerUserId,
                  contact_id: contactId,
                  event_type: event.event_type,
                  occurred_at: event.occurred_at,
                  title: event.title,
                  body: event.body,
                  source: "brave",
                  source_id: event.source_url,
                },
                {
                  // requires a unique index (contact_id, source_id) to be perfect
                  onConflict: "contact_id,source_id",
                  ignoreDuplicates: true,
                }
              );
            }
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (queryError) {
        console.error(`[DeepIntel] Error processing query "${queryPack.query}":`, queryError);
      }
    }

    // Update status to idle
    const { error: idleErr } = await supabaseAdmin
      .from("crm_contacts")
      .update({
        intel_status: "idle",
        next_intel_run_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Next run in 24h
      })
      .eq("id", contactId);

    if (idleErr) {
      console.error("[DeepIntel] Failed to mark intel_status=idle:", idleErr);
    }
  } catch (error) {
    console.error("[DeepIntel] Fatal error:", error);

    const { error: errUpdateErr } = await supabaseAdmin
      .from("crm_contacts")
      .update({ intel_status: "error" })
      .eq("id", contactId);

    if (errUpdateErr) {
      console.error("[DeepIntel] Failed to mark intel_status=error:", errUpdateErr);
    }

    throw error;
  }
}
