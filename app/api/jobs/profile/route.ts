// Job Profile API
// app/api/jobs/profile/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const { data: profile } = await supabaseAdmin
      .from("user_job_profiles")
      .select("*, job_graph_nodes(*)")
      .eq("user_id", dbUserId)
      .eq("is_active", true)
      .maybeSingle();

    return NextResponse.json(profile || null);
  } catch (err: any) {
    console.error("[JobProfile] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get profile" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const body = await req.json();
    const { path, custom_title, notes } = body;

    if (!path) {
      return NextResponse.json({ error: "path is required" }, { status: 400 });
    }

    // Find job node by path
    const { data: jobNode } = await supabaseAdmin
      .from("job_graph_nodes")
      .select("id")
      .eq("path", path)
      .single();

    if (!jobNode) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Deactivate existing profile
    await supabaseAdmin
      .from("user_job_profiles")
      .update({ is_active: false })
      .eq("user_id", dbUserId)
      .eq("is_active", true);

    // Create new profile
    const { data: profile } = await supabaseAdmin
      .from("user_job_profiles")
      .insert({
        user_id: dbUserId,
        job_node_id: jobNode.id,
        custom_title: custom_title || null,
        notes: notes || null,
        is_active: true,
      })
      .select("*")
      .single();

    return NextResponse.json(profile);
  } catch (err: any) {
    console.error("[JobProfile] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to save profile" },
      { status: 500 }
    );
  }
}




