// Executive Function Cortex: Follow-Through Tracker
// Monitors commitments, tracks progress, and nudges completion

import { createClient } from "@supabase/supabase-js";

import { CognitiveMesh } from "../cognitive-mesh";
import {
  Commitment,
  CommitmentCheckIn,
  FollowThroughNudge,
  GeneratedAction,
  ActionUrgency,
} from "./types";
import { getOpenAI } from "@/services/ai/openai";



function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// COMMITMENT TRACKING
// ============================================

export async function createCommitment(
  userId: string,
  commitment: {
    commitment_type: "promise" | "deadline" | "goal" | "habit";
    title: string;
    description?: string;
    made_to?: string;
    due_at?: string;
    related_entity_ids?: string[];
  }
): Promise<Commitment> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("efc_commitments")
    .insert({
      user_id: userId,
      commitment_type: commitment.commitment_type,
      title: commitment.title,
      description: commitment.description,
      made_to: commitment.made_to,
      due_at: commitment.due_at,
      related_entity_ids: commitment.related_entity_ids || [],
      status: "active",
      progress: 0,
      check_ins: [],
    })
    .select()
    .single();

  if (error) throw error;

  // Log to Third Brain
  try {
    await CognitiveMesh.createFragment(userId, {
      fragment_type: "commitment",
      content: `Committed to: ${commitment.title}${commitment.made_to ? ` (to ${commitment.made_to})` : ""}${commitment.due_at ? ` by ${new Date(commitment.due_at).toLocaleDateString()}` : ""}`,
      importance: 7,
      time_scope: commitment.due_at ? "long_term" : "evergreen",
    });
  } catch (e) {
    console.error("Failed to log commitment to Third Brain:", e);
  }

  return data;
}

export async function getActiveCommitments(
  userId: string,
  options: {
    type?: string;
    dueBefore?: string;
    limit?: number;
  } = {}
): Promise<Commitment[]> {
  const supabase = getSupabase();

  let query = supabase
    .from("efc_commitments")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("due_at", { ascending: true, nullsFirst: false });

  if (options.type) {
    query = query.eq("commitment_type", options.type);
  }
  if (options.dueBefore) {
    query = query.lte("due_at", options.dueBefore);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ============================================
// PROGRESS TRACKING
// ============================================

export async function updateCommitmentProgress(
  userId: string,
  commitmentId: string,
  progress: number,
  notes?: string,
  blockers?: string[]
): Promise<Commitment> {
  const supabase = getSupabase();

  // Get current commitment
  const { data: current } = await supabase
    .from("efc_commitments")
    .select("*")
    .eq("id", commitmentId)
    .eq("user_id", userId)
    .single();

  if (!current) throw new Error("Commitment not found");

  // Add check-in
  const checkIn: CommitmentCheckIn = {
    timestamp: new Date().toISOString(),
    progress: Math.min(100, Math.max(0, progress)),
    notes,
    blockers,
  };

  const updatedCheckIns = [...(current.check_ins || []), checkIn];

  // Determine status
  let status = "active";
  if (progress >= 100) {
    status = "completed";
  }

  const { data, error } = await supabase
    .from("efc_commitments")
    .update({
      progress: checkIn.progress,
      check_ins: updatedCheckIns,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", commitmentId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;

  // If completed, log celebration
  if (status === "completed") {
    await createNudge(userId, {
      commitment_id: commitmentId,
      nudge_type: "celebration",
      message: `🎉 You completed "${current.title}"! Great follow-through.`,
      urgency: "today",
    });
  }

  return data;
}

export async function markCommitmentBroken(
  userId: string,
  commitmentId: string,
  reason?: string
): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from("efc_commitments")
    .update({
      status: "broken",
      metadata: { broken_reason: reason },
      updated_at: new Date().toISOString(),
    })
    .eq("id", commitmentId)
    .eq("user_id", userId);
}

// ============================================
// NUDGE GENERATION
// ============================================

export async function createNudge(
  userId: string,
  nudge: {
    commitment_id?: string;
    action_id?: string;
    nudge_type: "reminder" | "encouragement" | "warning" | "celebration";
    message: string;
    urgency: ActionUrgency;
    suggested_action_data?: any;
  }
): Promise<FollowThroughNudge> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("efc_nudges")
    .insert({
      user_id: userId,
      commitment_id: nudge.commitment_id,
      action_id: nudge.action_id,
      nudge_type: nudge.nudge_type,
      message: nudge.message,
      urgency: nudge.urgency,
      suggested_action_data: nudge.suggested_action_data,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveNudges(
  userId: string
): Promise<FollowThroughNudge[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from("efc_nudges")
    .select("*")
    .eq("user_id", userId)
    .eq("acknowledged", false)
    .or(`snoozed_until.is.null,snoozed_until.lt.${new Date().toISOString()}`)
    .order("created_at", { ascending: false });

  return data || [];
}

export async function acknowledgeNudge(
  userId: string,
  nudgeId: string
): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from("efc_nudges")
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
    })
    .eq("id", nudgeId)
    .eq("user_id", userId);
}

export async function snoozeNudge(
  userId: string,
  nudgeId: string,
  hours: number
): Promise<void> {
  const supabase = getSupabase();

  await supabase
    .from("efc_nudges")
    .update({
      snoozed_until: new Date(Date.now() + hours * 60 * 60 * 1000).toISOString(),
    })
    .eq("id", nudgeId)
    .eq("user_id", userId);
}

// ============================================
// AUTOMATED NUDGE GENERATION
// ============================================

export async function generateNudgesForUser(
  userId: string
): Promise<FollowThroughNudge[]> {
  const supabase = getSupabase();
  const now = new Date();
  const generatedNudges: FollowThroughNudge[] = [];

  // Get active commitments
  const commitments = await getActiveCommitments(userId);

  for (const commitment of commitments) {
    // Skip if recently nudged
    const { data: recentNudge } = await supabase
      .from("efc_nudges")
      .select("id")
      .eq("commitment_id", commitment.id)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(1)
      .single();

    if (recentNudge) continue;

    // Check if overdue
    if (commitment.due_at) {
      const dueDate = new Date(commitment.due_at);
      const daysUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      if (daysUntilDue < 0) {
        // Overdue warning
        const nudge = await createNudge(userId, {
          commitment_id: commitment.id,
          nudge_type: "warning",
          message: `⚠️ "${commitment.title}" is overdue${commitment.made_to ? ` - ${commitment.made_to} is waiting` : ""}. What's blocking you?`,
          urgency: "immediate",
        });
        generatedNudges.push(nudge);
      } else if (daysUntilDue <= 1) {
        // Due soon reminder
        const nudge = await createNudge(userId, {
          commitment_id: commitment.id,
          nudge_type: "reminder",
          message: `📅 "${commitment.title}" is due ${daysUntilDue < 0.5 ? "today" : "tomorrow"}. You're at ${commitment.progress}% progress.`,
          urgency: "today",
        });
        generatedNudges.push(nudge);
      } else if (daysUntilDue <= 3 && commitment.progress < 50) {
        // At risk - not enough progress
        const nudge = await createNudge(userId, {
          commitment_id: commitment.id,
          nudge_type: "encouragement",
          message: `💪 "${commitment.title}" due in ${Math.ceil(daysUntilDue)} days - you're at ${commitment.progress}%. Make some progress today?`,
          urgency: "today",
        });
        generatedNudges.push(nudge);
      }
    }

    // Check for stalled progress
    const lastCheckIn = commitment.check_ins?.[commitment.check_ins.length - 1];
    if (lastCheckIn) {
      const daysSinceCheckIn = (now.getTime() - new Date(lastCheckIn.timestamp).getTime()) / (1000 * 60 * 60 * 24);

      if (daysSinceCheckIn > 7 && commitment.progress < 100) {
        const nudge = await createNudge(userId, {
          commitment_id: commitment.id,
          nudge_type: "encouragement",
          message: `👋 Haven't heard about "${commitment.title}" in a while. How's it going?`,
          urgency: "this_week",
        });
        generatedNudges.push(nudge);
      }
    }
  }

  return generatedNudges;
}

// ============================================
// AI-POWERED NUDGE CONTENT
// ============================================

export async function generateSmartNudge(
  userId: string,
  commitment: Commitment
): Promise<string> {
  // Get context about the commitment
  const context = commitment.description || commitment.title;
  const progress = commitment.progress;
  const madeTo = commitment.made_to;
  const dueAt = commitment.due_at;

  const prompt = `Generate a brief, encouraging nudge message for someone who committed to: "${context}"

Current progress: ${progress}%
${madeTo ? `Made to: ${madeTo}` : "Personal commitment"}
${dueAt ? `Due: ${new Date(dueAt).toLocaleDateString()}` : "No deadline"}

The nudge should be:
- Warm and supportive, not guilt-inducing
- Action-oriented (suggest a small next step)
- Brief (1-2 sentences)
- Include an appropriate emoji

Return just the nudge message.`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    max_tokens: 100,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || `Time to make progress on "${commitment.title}"! What's one small step you can take?`;
}

// ============================================
// COMMITMENT EXTRACTION FROM TEXT
// ============================================

export async function extractCommitmentsFromText(
  userId: string,
  text: string
): Promise<Partial<Commitment>[]> {
  const prompt = `Extract any commitments, promises, or deadlines from this text:

"${text}"

For each commitment found, return JSON with:
- commitment_type: "promise" | "deadline" | "goal" | "habit"
- title: brief description
- made_to: person/entity if applicable (null otherwise)
- due_at: ISO date if mentioned (null otherwise)

Return a JSON array of commitments, or empty array if none found.`;

  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  try {
    const parsed = JSON.parse(response.choices[0]?.message?.content || "{}");
    return parsed.commitments || [];
  } catch {
    return [];
  }
}

// ============================================
// FOLLOW-THROUGH SCORE
// ============================================

export async function calculateFollowThroughScore(
  userId: string
): Promise<{
  score: number;
  completed: number;
  active: number;
  broken: number;
  onTime: number;
  late: number;
}> {
  const supabase = getSupabase();

  const { data: commitments } = await supabase
    .from("efc_commitments")
    .select("status, due_at, check_ins, created_at")
    .eq("user_id", userId)
    .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());

  if (!commitments?.length) {
    return { score: 100, completed: 0, active: 0, broken: 0, onTime: 0, late: 0 };
  }

  let completed = 0;
  let active = 0;
  let broken = 0;
  let onTime = 0;
  let late = 0;

  for (const c of commitments) {
    if (c.status === "completed") {
      completed++;
      // Check if completed on time
      const lastCheckIn = c.check_ins?.[c.check_ins.length - 1];
      if (c.due_at && lastCheckIn) {
        const completedAt = new Date(lastCheckIn.timestamp);
        const dueAt = new Date(c.due_at);
        if (completedAt <= dueAt) {
          onTime++;
        } else {
          late++;
        }
      } else {
        onTime++;
      }
    } else if (c.status === "broken") {
      broken++;
    } else {
      active++;
    }
  }

  // Calculate score (0-100)
  const total = completed + broken;
  const score = total > 0
    ? Math.round((completed / total) * 100 * (onTime / (onTime + late || 1)))
    : 100;

  return { score, completed, active, broken, onTime, late };
}

// ============================================
// EXPORTS
// ============================================

export const FollowThroughTracker = {
  // Commitments
  createCommitment,
  getActiveCommitments,
  updateCommitmentProgress,
  markCommitmentBroken,
  extractCommitmentsFromText,

  // Nudges
  createNudge,
  getActiveNudges,
  acknowledgeNudge,
  snoozeNudge,
  generateNudgesForUser,
  generateSmartNudge,

  // Analytics
  calculateFollowThroughScore,
};

export default FollowThroughTracker;