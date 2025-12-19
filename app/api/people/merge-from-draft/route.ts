import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeName, normalizeEmail, normalizePhone } from "@/lib/contacts/normalize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { winner_contact_id, draft, strategy = "fill_blanks" } = body;

    if (!winner_contact_id || !draft) {
      return NextResponse.json(
        { error: "winner_contact_id and draft are required" },
        { status: 400 }
      );
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

    // Load winner contact
    const { data: winner, error: fetchError } = await supabaseAdmin
      .from("crm_contacts")
      .select("*")
      .eq("id", winner_contact_id)
      .eq("user_id", dbUserId)
      .eq("status", "active")
      .single();

    if (fetchError || !winner) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Build update payload based on strategy
    const updatedFields: any = {};

    // Parse draft fields
    const draftFields = {
      full_name: draft.full_name || `${draft.first_name || ""} ${draft.last_name || ""}`.trim(),
      first_name: draft.first_name || null,
      last_name: draft.last_name || null,
      primary_email: draft.email || draft.primary_email || null,
      primary_phone: draft.phone || draft.primary_phone || null,
      company_name: draft.company_name || null,
      title: draft.job_title || draft.title || null,
      type: draft.type || null,
    };

    // Apply merge strategy
    if (strategy === "fill_blanks") {
      // Keep winner values, fill from draft if blank
      updatedFields.full_name = winner.full_name || draftFields.full_name;
      updatedFields.first_name = winner.first_name || draftFields.first_name;
      updatedFields.last_name = winner.last_name || draftFields.last_name;
      updatedFields.primary_email = winner.primary_email || draftFields.primary_email;
      updatedFields.primary_phone = winner.primary_phone || draftFields.primary_phone;
      updatedFields.company_name = winner.company_name || draftFields.company_name;
      updatedFields.title = winner.title || draftFields.title;
      if (draftFields.type && !winner.type) {
        updatedFields.type = draftFields.type;
      }
    } else if (strategy === "prefer_new") {
      // Prefer draft values when present
      updatedFields.full_name = draftFields.full_name || winner.full_name;
      updatedFields.first_name = draftFields.first_name || winner.first_name;
      updatedFields.last_name = draftFields.last_name || winner.last_name;
      updatedFields.primary_email = draftFields.primary_email || winner.primary_email;
      updatedFields.primary_phone = draftFields.primary_phone || winner.primary_phone;
      updatedFields.company_name = draftFields.company_name || winner.company_name;
      updatedFields.title = draftFields.title || winner.title;
      updatedFields.type = draftFields.type || winner.type;
    } else {
      // prefer_winner (default): keep winner, only fill if blank
      updatedFields.full_name = winner.full_name || draftFields.full_name;
      updatedFields.first_name = winner.first_name || draftFields.first_name;
      updatedFields.last_name = winner.last_name || draftFields.last_name;
      updatedFields.primary_email = winner.primary_email || draftFields.primary_email;
      updatedFields.primary_phone = winner.primary_phone || draftFields.primary_phone;
      updatedFields.company_name = winner.company_name || draftFields.company_name;
      updatedFields.title = winner.title || draftFields.title;
      updatedFields.type = winner.type || draftFields.type;
    }

    // Recompute normalized fields
    updatedFields.normalized_full_name = normalizeName(updatedFields.full_name);
    updatedFields.normalized_email = normalizeEmail(updatedFields.primary_email);
    updatedFields.normalized_phone = normalizePhone(updatedFields.primary_phone);

    // Handle tags if provided
    if (draft.tag_ids && Array.isArray(draft.tag_ids) && draft.tag_ids.length > 0) {
      // Link tags to winner contact
      const tagLinksToInsert = draft.tag_ids.map((tagId: string) => ({
        user_id: dbUserId,
        contact_id: winner_contact_id,
        tag_id: tagId,
      }));

      // Remove existing links first to avoid duplicates
      await supabaseAdmin
        .from("contact_tag_links")
        .delete()
        .eq("user_id", dbUserId)
        .eq("contact_id", winner_contact_id)
        .in("tag_id", draft.tag_ids);

      // Insert new links
      await supabaseAdmin.from("contact_tag_links").insert(tagLinksToInsert);
    }

    // Update winner contact
    const { data: updatedContact, error: updateError } = await supabaseAdmin
      .from("crm_contacts")
      .update(updatedFields)
      .eq("id", winner_contact_id)
      .select()
      .single();

    if (updateError) {
      console.error("[MergeFromDraft] Update error:", updateError);
      return NextResponse.json({ error: "Failed to update contact" }, { status: 500 });
    }

    return NextResponse.json(
      {
        ok: true,
        contact: updatedContact,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[MergeFromDraft] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to merge from draft" },
      { status: 500 }
    );
  }
}

