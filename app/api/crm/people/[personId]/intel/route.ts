import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { resolveCanonicalContactId } from "@/lib/crm/canonical";
import { looksLikeMissingColumn } from "@/lib/crm/intel-schema";

export const dynamic = "force-dynamic";

/**
 * GET contact intelligence
 * Returns intel row or fallback object
 */
export async function GET(
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

  const { data, error } = await supabaseAdmin
    .from("crm_contact_intel")
    .select("*")
    .eq("contact_id", canonicalId)
    .eq("owner_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    if (looksLikeMissingColumn(error.message, "owner_user_id")) {
      return NextResponse.json(
        { error: `DB schema missing owner_user_id on crm_contact_intel. Add column + index. (${error.message})` },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const intel =
    data ??
    ({
      contact_id: canonicalId,
      owner_user_id: clerkUserId,
      brief_md: "",
      personality: {},
      relationship: {},
      next_actions: [],
      version: 1,
      updated_at: new Date().toISOString(),
    } as const);

  return NextResponse.json({ intel });
}
