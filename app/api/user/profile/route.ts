import { NextResponse } from "next/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function GET(req: Request) {
  try {
    const access = await requireOpsAuth(req as any);
    if (!access.ok || !access.gate) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = access.gate.canon.userIdUuid;

    const { data: profile, error } = await getSupabaseAdminRuntimeClient()
      .from("user_profiles")
      .select(`
        *,
        job_title:job_titles(
          id, name,
          category:job_categories(
            id, name,
            industry:industries(id, name)
          )
        )
      `)
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return NextResponse.json({ profile });
  } catch (err: any) {
    console.error("Profile API error:", err);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}