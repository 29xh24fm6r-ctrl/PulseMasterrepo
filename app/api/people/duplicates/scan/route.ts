import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { findDuplicateCandidates } from "@/lib/contacts/dedup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Get all active contacts
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, full_name, primary_email, primary_phone, company_name, title")
      .eq("user_id", dbUserId)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (contactsError) {
      return NextResponse.json({ error: "Failed to load contacts" }, { status: 500 });
    }

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ ok: true, suggestions: 0, processed: 0 });
    }

    const suggestions = new Map<string, any>(); // Key: sorted pair ID
    let processed = 0;

    // For each contact, check against others
    for (const contact of contacts) {
      processed++;
      const matches = await findDuplicateCandidates(dbUserId, {
        full_name: contact.full_name,
        primary_email: contact.primary_email,
        primary_phone: contact.primary_phone,
        company_name: contact.company_name,
        job_title: contact.title,
      });

      // Only include high/medium confidence matches
      const relevantMatches = matches.filter(
        (m) => m.confidence === "high" || m.confidence === "medium"
      );

      for (const match of relevantMatches) {
        // Skip if this is a self-match
        if (match.contact.id === contact.id) continue;

        // Create unique key for pair (sorted IDs)
        const pairKey = [contact.id, match.contact.id].sort().join(":");

        // Only store if we haven't seen this pair before, and keep the higher score
        if (!suggestions.has(pairKey)) {
          suggestions.set(pairKey, {
            a_contact_id: contact.id,
            b_contact_id: match.contact.id,
            score: match.score,
            reasons: match.reasons,
          });
        } else {
          const existing = suggestions.get(pairKey)!;
          if (match.score > existing.score) {
            suggestions.set(pairKey, {
              ...existing,
              score: match.score,
              reasons: match.reasons,
            });
          }
        }
      }
    }

    // Write suggestions to database
    const suggestionsArray = Array.from(suggestions.values());
    let written = 0;

    if (suggestionsArray.length > 0) {
      // Clear existing open suggestions for this user
      await supabaseAdmin
        .from("crm_contact_duplicate_suggestions")
        .delete()
        .eq("user_id", dbUserId)
        .eq("status", "open");

      // Insert new suggestions
      const { error: insertError } = await supabaseAdmin
        .from("crm_contact_duplicate_suggestions")
        .insert(
          suggestionsArray.map((s) => ({
            user_id: dbUserId,
            a_contact_id: s.a_contact_id,
            b_contact_id: s.b_contact_id,
            score: s.score,
            reasons: s.reasons,
            status: "open",
          }))
        );

      if (!insertError) {
        written = suggestionsArray.length;
      }
    }

    return NextResponse.json(
      {
        ok: true,
        suggestions: written,
        processed,
        totalContacts: contacts.length,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (err: any) {
    console.error("[DuplicateScan] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scan for duplicates" },
      { status: 500 }
    );
  }
}

