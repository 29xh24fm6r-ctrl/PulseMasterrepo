// Career Tracks & Levels Engine
// lib/career/tracks.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface CareerLevel {
  id: string;
  level_index: number;
  code: string;
  label: string;
  description: string | null;
  min_overall_score: number | null;
  min_days_at_or_above: number;
  min_total_xp: number;
  focus_kpis: string[] | null;
}

/**
 * Ensure default career track exists for a job graph node
 */
export async function ensureDefaultCareerTrackForJob(
  jobGraphNodeId: string
): Promise<string> {
  // Check if track exists
  const { data: existing } = await supabaseAdmin
    .from("career_tracks")
    .select("id")
    .eq("job_graph_node_id", jobGraphNodeId)
    .eq("is_default", true)
    .maybeSingle();

  if (existing) {
    return existing.id;
  }

  // Get job node info
  const { data: jobNode } = await supabaseAdmin
    .from("job_graph_nodes")
    .select("name, path")
    .eq("id", jobGraphNodeId)
    .single();

  if (!jobNode) {
    throw new Error("Job graph node not found");
  }

  // Create track
  const trackName = `${jobNode.name} Mastery Track`;
  const { data: track } = await supabaseAdmin
    .from("career_tracks")
    .insert({
      job_graph_node_id: jobGraphNodeId,
      name: trackName,
      description: `Mastery progression track for ${jobNode.name}`,
      is_default: true,
    })
    .select("id")
    .single();

  if (!track) {
    throw new Error("Failed to create career track");
  }

  // Get KPIs for this job to set focus_kpis
  const { data: kpis } = await supabaseAdmin
    .from("job_kpis")
    .select("kpi_key")
    .eq("job_node_id", jobGraphNodeId)
    .limit(5);

  const focusKpis = (kpis || []).map((k) => k.kpi_key);

  // Create 5 levels
  const levels = [
    {
      level_index: 0,
      code: "rookie",
      label: "Rookie",
      description: "Getting started. Building foundational habits.",
      min_overall_score: 0.2,
      min_days_at_or_above: 3,
      min_total_xp: 0,
      focus_kpis: focusKpis.length > 0 ? focusKpis : null,
    },
    {
      level_index: 1,
      code: "operator",
      label: "Operator",
      description: "Consistent execution. Meeting daily standards.",
      min_overall_score: 0.4,
      min_days_at_or_above: 7,
      min_total_xp: 1000,
      focus_kpis: focusKpis.length > 0 ? focusKpis : null,
    },
    {
      level_index: 2,
      code: "pro",
      label: "Pro",
      description: "Reliable performance. Exceeding expectations regularly.",
      min_overall_score: 0.6,
      min_days_at_or_above: 15,
      min_total_xp: 5000,
      focus_kpis: focusKpis.length > 0 ? focusKpis : null,
    },
    {
      level_index: 3,
      code: "elite",
      label: "Elite",
      description: "Top-tier execution. Consistently operating at peak.",
      min_overall_score: 0.75,
      min_days_at_or_above: 30,
      min_total_xp: 15000,
      focus_kpis: focusKpis.length > 0 ? focusKpis : null,
    },
    {
      level_index: 4,
      code: "legend",
      label: "Legend",
      description: "Mastery achieved. Setting the standard for others.",
      min_overall_score: 0.9,
      min_days_at_or_above: 45,
      min_total_xp: 30000,
      focus_kpis: focusKpis.length > 0 ? focusKpis : null,
    },
  ];

  for (const level of levels) {
    await supabaseAdmin.from("career_levels").insert({
      career_track_id: track.id,
      ...level,
    });
  }

  return track.id;
}

/**
 * Get career track for a job graph node
 */
export async function getCareerTrackForJob(
  jobGraphNodeId: string
): Promise<{ id: string; name: string; levels: CareerLevel[] } | null> {
  const trackId = await ensureDefaultCareerTrackForJob(jobGraphNodeId);

  const { data: track } = await supabaseAdmin
    .from("career_tracks")
    .select("id, name, description")
    .eq("id", trackId)
    .single();

  if (!track) {
    return null;
  }

  const { data: levels } = await supabaseAdmin
    .from("career_levels")
    .select("*")
    .eq("career_track_id", trackId)
    .order("level_index", { ascending: true });

  return {
    id: track.id,
    name: track.name,
    levels: (levels || []) as CareerLevel[],
  };
}




