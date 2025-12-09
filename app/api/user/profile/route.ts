import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
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