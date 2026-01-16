import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// The global supabase client using the service role key is being moved.
// For GET requests, a new client will be initialized if needed, or the existing one will be used if it's for public access.

// GET - Fetch job taxonomy
export async function GET(req: NextRequest) {
  // Initialize Supabase client for GET requests.
  // If this GET endpoint is intended for public access without service role privileges,
  // consider using process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY instead of SERVICE_ROLE_KEY.
  // For now, we'll use the service role key as it was used globally before.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const industryId = searchParams.get("industry");
    const categoryId = searchParams.get("category");

    // If searching, search across all job titles
    if (search) {
      const { data: jobs, error } = await supabase
        .from("job_titles")
        .select(`
          id, name, aliases,
          category:job_categories(
            id, name,
            industry:industries(id, name, icon)
          )
        `)
        .ilike("name", `%${search}%`)
        .eq("is_active", true)
        .limit(20);

      if (error) throw error;
      return NextResponse.json({ jobs });
    }

    // If category specified, get jobs in that category
    if (categoryId) {
      const { data: jobs, error } = await supabase
        .from("job_titles")
        .select("id, name, aliases, description")
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return NextResponse.json({ jobs });
    }

    // If industry specified, get categories in that industry
    if (industryId) {
      const { data: categories, error } = await supabase
        .from("job_categories")
        .select("id, name, icon")
        .eq("industry_id", industryId)
        .order("sort_order");

      if (error) throw error;
      return NextResponse.json({ categories });
    }

    // Default: return all industries
    const { data: industries, error } = await supabase
      .from("industries")
      .select("id, name, icon")
      .order("sort_order");

    if (error) throw error;
    return NextResponse.json({ industries });

  } catch (err: any) {
    console.error("Jobs API error:", err);
    return NextResponse.json({ error: "Failed to fetch jobs" }, { status: 500 });
  }
}

// POST - Submit job request or set user's job
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, jobTitleId, suggestedIndustry, suggestedCategory, suggestedTitle, description } = body;

    if (action === "set_job" && jobTitleId) {
      // Update user's job
      const { error } = await supabase
        .from("user_profiles")
        .update({ job_title_id: jobTitleId })
        .eq("user_id", userId);

      if (error) throw error;

      // Increment user_count on job_titles
      await supabase.rpc("increment_job_count", { job_id: jobTitleId });

      return NextResponse.json({ ok: true });
    }

    if (action === "request_job") {
      // Submit job request
      const { error } = await supabase
        .from("job_requests")
        .insert({
          user_id: userId,
          suggested_industry: suggestedIndustry,
          suggested_category: suggestedCategory,
          suggested_title: suggestedTitle,
          description,
        });

      if (error) throw error;
      return NextResponse.json({ ok: true, message: "Job request submitted" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: any) {
    console.error("Jobs POST error:", err);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}