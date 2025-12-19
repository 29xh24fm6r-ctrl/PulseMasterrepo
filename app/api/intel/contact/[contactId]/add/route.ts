import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { extractReadableText } from "@/lib/intel/extract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { contactId: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactId } = params;
    const body = await req.json();
    const { kind, url, title, text, category = "other", note, saveToSecondBrain = true } = body;

    if (kind === "url" && !url) {
      return NextResponse.json({ error: "URL is required for url kind" }, { status: 400 });
    }

    if (kind === "paste" && !text) {
      return NextResponse.json({ error: "Text is required for paste kind" }, { status: 400 });
    }

    // Resolve user UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id;
    if (!dbUserId) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify contact belongs to user
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, full_name")
      .eq("id", contactId)
      .eq("user_id", dbUserId)
      .single();

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    let sourceUrl = url || "user_added_paste";
    let extractedText = text;
    let extractedTitle = title;

    // Extract from URL if provided
    if (kind === "url" && url) {
      try {
        const extracted = await extractReadableText(url);
        extractedText = extracted.text || text;
        extractedTitle = extracted.title || title || url;
      } catch (err) {
        console.warn(`[IntelAdd] Failed to extract from ${url}:`, err);
        // Continue with snippet/text if provided
      }
    }

    // Create source (user_added = verified)
    const { data: source, error: sourceError } = await supabaseAdmin
      .from("crm_contact_intel_sources")
      .upsert(
        {
          user_id: dbUserId,
          contact_id: contactId,
          source_type: "user_added",
          url: sourceUrl,
          title: extractedTitle,
          snippet: extractedText?.substring(0, 500) || "",
          extracted_text: extractedText,
          match_confidence: 100,
          match_status: "verified",
          match_evidence: { user_added: true },
        },
        {
          onConflict: "user_id,contact_id,url",
          ignoreDuplicates: false,
        }
      )
      .select()
      .single();

    if (sourceError) {
      console.error("[IntelAdd] Failed to create source:", sourceError);
      return NextResponse.json({ error: "Failed to save intel source" }, { status: 500 });
    }

    // Create claim from user note or auto-summary
    const claimText = note || (extractedText ? `${extractedText.substring(0, 500)}...` : "User-added intel");

    const { data: claim, error: claimError } = await supabaseAdmin
      .from("crm_contact_intel_claims")
      .insert({
        user_id: dbUserId,
        contact_id: contactId,
        category,
        claim: claimText,
        source_url: sourceUrl,
        confidence: 100,
        status: "active",
      })
      .select()
      .single();

    if (claimError) {
      console.error("[IntelAdd] Failed to create claim:", claimError);
      // Non-fatal, continue
    }

    // Add to timeline (interaction)
    try {
      await supabaseAdmin
        .from("crm_interactions")
        .insert({
          user_id: dbUserId,
          contact_id: contactId,
          type: "note",
          subject: `Intel added: ${extractedTitle || sourceUrl}`,
          summary: `User added intel${kind === "url" ? ` from ${url}` : ""}. ${note || ""}`,
          occurred_at: new Date().toISOString(),
        });
    } catch (timelineErr) {
      console.warn("[IntelAdd] Failed to add timeline entry:", timelineErr);
      // Non-fatal
    }

    // Save to Second Brain (tb_nodes) if requested
    if (saveToSecondBrain) {
      try {
        // Check if contact node exists
        const { data: contactNode } = await supabaseAdmin
          .from("tb_nodes")
          .select("id")
          .eq("user_id", dbUserId)
          .eq("source_table", "crm_contacts")
          .eq("source_id", contactId)
          .maybeSingle();

        // Create intel node
        const { data: intelNode, error: nodeError } = await supabaseAdmin
          .from("tb_nodes")
          .insert({
            user_id: dbUserId,
            type: "evidence",
            source_table: "crm_contact_intel_sources",
            source_id: source.id,
            props: {
              contact_id: contactId,
              url: sourceUrl,
              text: extractedText?.substring(0, 1000),
              category,
              user_added: true,
              title: extractedTitle,
            },
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (!nodeError && intelNode && contactNode) {
          // Link intel to contact in graph
          await supabaseAdmin
            .from("tb_edges")
            .insert({
              user_id: dbUserId,
              from_node_id: contactNode.id,
              to_node_id: intelNode.id,
              kind: "has_evidence",
              props: {
                source: "user_added_intel",
              },
            });
        }
      } catch (brainErr: any) {
        console.warn("[IntelAdd] Failed to save to Second Brain:", brainErr);
        // Log error in intel run but don't fail
      }
    }

    // Create intel run record (user_added type)
    try {
      await supabaseAdmin
        .from("crm_intel_runs")
        .insert({
          user_id: dbUserId,
          contact_id: contactId,
          run_type: "user_added",
          queries: [],
          results_count: 1,
          errors: [],
          finished_at: new Date().toISOString(),
        });
    } catch (runErr) {
      // Non-fatal
      console.warn("[IntelAdd] Failed to create run record:", runErr);
    }

    return NextResponse.json(
      {
        ok: true,
        source,
        claim,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[IntelAdd] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to add intel" },
      { status: 500 }
    );
  }
}

