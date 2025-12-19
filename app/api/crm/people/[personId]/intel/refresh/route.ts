import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Refresh contact intelligence snapshot
 * Recomputes relationship score, trends, and flags
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

  // Call refresh function
  const { error } = await supabaseAdmin.rpc("refresh_contact_intel", {
    p_contact_id: canonicalId,
    p_owner_user_id: clerkUserId,
  });

  if (error) {
    return NextResponse.json(
      { error: error.message || "Failed to refresh intel" },
      { status: 500 }
    );
  }

  // Fetch updated intel
  const { data: intel } = await supabaseAdmin
    .from("crm_contact_intel")
    .select("*")
    .eq("contact_id", canonicalId)
    .eq("owner_user_id", clerkUserId)
    .single();

  return NextResponse.json({
    success: true,
    intel: intel || null,
  });
}

