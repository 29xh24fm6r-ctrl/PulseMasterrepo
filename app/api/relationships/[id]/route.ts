/**
 * Relationship Detail API
 * GET /api/relationships/[id] - Get relationship details
 * POST /api/relationships/[id] - Log interaction
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";
import OpenAI from "openai";

// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
import { getOpenAI } from "@/lib/llm/client";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const mode = req.nextUrl.searchParams.get("mode");

    if (mode === "interactions") {
      const { data } = await supabaseAdmin
        .from("relationship_interactions")
        .select("*")
        .eq("relationship_id", id)
        .eq("user_id_uuid", userId)
        .order("occurred_at", { ascending: false })
        .limit(50);

      const interactions = (data || []).map((i) => ({
        id: i.id,
        type: i.type,
        direction: i.direction,
        subject: i.subject,
        summary: i.summary,
        sentiment: i.sentiment,
        occurredAt: i.occurred_at,
      }));

      return NextResponse.json({ interactions });
    }

    if (mode === "summary") {
      // Get relationship and recent interactions
      const [relRes, intRes] = await Promise.all([
        supabaseAdmin
          .from("relationships")
          .select("*")
          .eq("id", id)
          .eq("user_id_uuid", userId)
          .single(),
        supabaseAdmin
          .from("relationship_interactions")
          .select("*")
          .eq("relationship_id", id)
          .order("occurred_at", { ascending: false })
          .limit(20),
      ]);

      const rel = relRes.data;
      const interactions = intRes.data || [];

      if (!rel) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const prompt = `Summarize this professional relationship and suggest ways to strengthen it:

Name: ${rel.name}
Company: ${rel.company || "Unknown"}
Role: ${rel.role || "Unknown"}
Relationship Type: ${rel.relationship}
Importance: ${rel.importance}
Health Score: ${rel.health_score}/100
Total Interactions: ${rel.interaction_count}
Last Contact: ${rel.last_contact_at || "Never"}

Recent Interactions:
${interactions.map((i) => `- ${i.type} (${i.direction}): ${i.subject || i.summary || "No details"}`).join("\n")}

Provide a 2-3 sentence summary and 1-2 specific suggestions to strengthen this relationship.`;

      const openai = getOpenAI();
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
      });

      return NextResponse.json({ summary: completion.choices[0].message.content });
    }

    // Default: get relationship
    const { data, error } = await supabaseAdmin
      .from("relationships")
      .select("*")
      .eq("id", id)
      .eq("user_id_uuid", userId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const relationship = {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
      role: data.role,
      relationship: data.relationship,
      importance: data.importance,
      healthScore: data.health_score,
      lastContactAt: data.last_contact_at,
      nextFollowupAt: data.next_followup_at,
      followupCadenceDays: data.followup_cadence_days,
      interactionCount: data.interaction_count,
      notes: data.notes,
      tags: data.tags || [],
    };

    return NextResponse.json({ relationship });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { type, direction, subject, summary, sentiment } = body;

    const now = new Date().toISOString();

    // Log interaction
    const { data: interaction, error: intError } = await supabaseAdmin
      .from("relationship_interactions")
      .insert({
        user_id_uuid: userId,
        relationship_id: id,
        type,
        direction,
        subject,
        summary,
        sentiment: sentiment || "neutral",
        occurred_at: now,
      })
      .select()
      .single();

    if (intError) {
      return NextResponse.json({ error: intError.message }, { status: 500 });
    }

    // Update relationship
    await supabaseAdmin
      .from("relationships")
      .update({
        last_contact_at: now,
        interaction_count: supabaseAdmin.rpc("increment_count", { row_id: id }),
      })
      .eq("id", id)
      .eq("user_id_uuid", userId);
    // Increment interaction count via RPC (ignore if fails)
    try {
      await supabaseAdmin.rpc("increment_relationship_interaction", { rel_id: id });
    } catch {
      // RPC not available, skip increment
    }

    return NextResponse.json({ interaction });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}