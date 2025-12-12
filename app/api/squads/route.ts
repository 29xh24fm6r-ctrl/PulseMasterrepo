// Squad API - GET /api/squads, POST /api/squads
// app/api/squads/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Get squads user belongs to
    const { data: squadMembers } = await supabaseAdmin
      .from("squad_members")
      .select("squad_id, squads:squad_id(id, name, description, created_at)")
      .eq("user_id", dbUserId);

    // Get member counts and active mission counts
    const squads = await Promise.all(
      (squadMembers || []).map(async (sm: any) => {
        const squad = sm.squads;
        const { count: memberCount } = await supabaseAdmin
          .from("squad_members")
          .select("*", { count: "exact", head: true })
          .eq("squad_id", squad.id);

        const { count: missionCount } = await supabaseAdmin
          .from("squad_missions")
          .select("*", { count: "exact", head: true })
          .eq("squad_id", squad.id)
          .in("status", ["active", "planned"]);

        return {
          id: squad.id,
          name: squad.name,
          description: squad.description,
          memberCount: memberCount || 0,
          activeMissionsCount: missionCount || 0,
          createdAt: squad.created_at,
        };
      })
    );

    return NextResponse.json({ squads });
  } catch (error: any) {
    console.error("Failed to fetch squads:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { orgId, name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name required" }, { status: 400 });
    }

    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .maybeSingle();

    const dbUserId = userRow?.id || userId;

    // Create squad
    const { data: squad, error: squadError } = await supabaseAdmin
      .from("squads")
      .insert({
        org_id: orgId || null,
        name,
        description,
        created_by: dbUserId,
      })
      .select()
      .single();

    if (squadError) {
      throw squadError;
    }

    // Add creator as owner
    const { error: memberError } = await supabaseAdmin
      .from("squad_members")
      .insert({
        squad_id: squad.id,
        user_id: dbUserId,
        role: "owner",
      });

    if (memberError) {
      throw memberError;
    }

    return NextResponse.json({ squad });
  } catch (error: any) {
    console.error("Failed to create squad:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}



