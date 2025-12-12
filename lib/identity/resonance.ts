// Identity Resonance Engine
// lib/identity/resonance.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface Identity {
  id: string;
  name: string; // "Warrior", "Strategist", "Father", etc.
  tagline?: string; // "I do hard things", etc.
  priority: number; // rank/importance
}

export interface ResonanceContext {
  coachId?: string;
  tags?: string[]; // e.g. ["sales", "family", "health"]
  risk_type?: string | null;
  emotion?: string | null;
}

export interface ResonanceResult {
  identity: Identity;
  score: number; // 0–1
  message: string; // short line to show user
}

/**
 * Load user identities
 */
async function loadUserIdentities(userId: string): Promise<Identity[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Try to load from identity tables (adapt based on your schema)
  try {
    // Try user_identities first
    const { data: identities } = await supabaseAdmin
      .from("user_identities")
      .select("*")
      .eq("user_id", dbUserId)
      .order("priority", { ascending: true });

    if (identities && identities.length > 0) {
      return identities.map((id: any) => ({
        id: id.id,
        name: id.name || id.identity_name,
        tagline: id.tagline || id.description,
        priority: id.priority || 0,
      }));
    }
  } catch (err) {
    console.warn("[IdentityResonance] user_identities table not found, trying alternatives");
  }

  // Fallback: try identity_roles or similar
  try {
    const { data: roles } = await supabaseAdmin
      .from("identity_roles")
      .select("*")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (roles && roles.length > 0) {
      return roles.map((role: any, idx: number) => ({
        id: role.id || `role_${idx}`,
        name: role.role_name || role.name || "Unknown",
        tagline: role.description,
        priority: idx,
      }));
    }
  } catch (err) {
    console.warn("[IdentityResonance] identity_roles table not found");
  }

  // Default identities if none found
  return [
    { id: "default_warrior", name: "Warrior", tagline: "I do hard things", priority: 0 },
    { id: "default_strategist", name: "Strategist", tagline: "I plan and execute", priority: 1 },
  ];
}

/**
 * Compute identity resonance score
 */
function computeResonanceScore(
  identity: Identity,
  context: ResonanceContext
): { score: number; message: string } {
  let score = 0;
  const reasons: string[] = [];

  const identityName = identity.name.toLowerCase();
  const tags = (context.tags || []).map((t) => t.toLowerCase());
  const emotion = (context.emotion || "").toLowerCase();
  const coachId = (context.coachId || "").toLowerCase();
  const riskType = (context.risk_type || "").toLowerCase();

  // Warrior identity
  if (identityName.includes("warrior") || identityName.includes("fighter")) {
    if (tags.includes("gym") || tags.includes("hard_thing") || tags.includes("discipline")) {
      score += 0.3;
      reasons.push("hard work");
    }
    if (emotion === "stress" || emotion === "hype" || emotion === "angry") {
      score += 0.3;
      reasons.push("overcoming challenge");
    }
    if (coachId === "warrior") {
      score += 0.2;
      reasons.push("warrior coach");
    }
    if (riskType === "stress_spike" || riskType === "overwhelm") {
      score += 0.2;
      reasons.push("facing difficulty");
    }
  }

  // Strategist identity
  if (identityName.includes("strategist") || identityName.includes("planner") || identityName.includes("thinker")) {
    if (tags.includes("planning") || tags.includes("strategy") || tags.includes("deep_work")) {
      score += 0.3;
      reasons.push("strategic thinking");
    }
    if (coachId === "executive" || coachId === "strategy") {
      score += 0.3;
      reasons.push("strategy coach");
    }
    if (riskType === "procrastination") {
      score += 0.2;
      reasons.push("needs planning");
    }
  }

  // Father/Mother/Partner identity
  if (
    identityName.includes("father") ||
    identityName.includes("mother") ||
    identityName.includes("parent") ||
    identityName.includes("partner")
  ) {
    if (tags.includes("family") || tags.includes("kids") || tags.includes("relationship")) {
      score += 0.4;
      reasons.push("family context");
    }
    if (coachId === "confidant" || coachId === "emotional") {
      score += 0.3;
      reasons.push("emotional support");
    }
  }

  // Confidant/Emotional identity
  if (identityName.includes("confidant") || identityName.includes("emotional") || identityName.includes("therapist")) {
    if (emotion === "sad" || emotion === "stress" || emotion === "anxious") {
      score += 0.3;
      reasons.push("emotional support needed");
    }
    if (coachId === "confidant" || coachId === "emotional") {
      score += 0.4;
      reasons.push("confidant coach");
    }
  }

  // Sales/Professional identity
  if (identityName.includes("sales") || identityName.includes("professional") || identityName.includes("executive")) {
    if (tags.includes("sales") || tags.includes("pipeline") || tags.includes("calls")) {
      score += 0.3;
      reasons.push("professional context");
    }
    if (coachId === "sales" || coachId === "executive") {
      score += 0.3;
      reasons.push("professional coach");
    }
  }

  // Generate message
  let message = "";
  if (score > 0.6) {
    if (identityName.includes("warrior")) {
      message = `This is a moment for your ${identity.name} identity — doing the hard thing even when stressed.`;
    } else if (identityName.includes("strategist")) {
      message = `Your ${identity.name} identity shines here — planning and executing with clarity.`;
    } else if (identityName.includes("father") || identityName.includes("mother")) {
      message = `Your ${identity.name} identity is present — showing up for what matters most.`;
    } else {
      message = `This aligns with your ${identity.name} identity — ${reasons[0] || "staying true to yourself"}.`;
    }
  }

  return { score: Math.min(1, score), message };
}

/**
 * Compute identity resonance for a context
 */
export async function computeIdentityResonance(
  userId: string,
  context: ResonanceContext
): Promise<ResonanceResult | null> {
  const identities = await loadUserIdentities(userId);

  if (identities.length === 0) {
    return null;
  }

  // Score each identity
  const scored: Array<{ identity: Identity; score: number; message: string }> = [];

  for (const identity of identities) {
    const result = computeResonanceScore(identity, context);
    if (result.score > 0.3) {
      // Only consider identities with meaningful resonance
      scored.push({
        identity,
        score: result.score,
        message: result.message,
      });
    }
  }

  if (scored.length === 0) {
    return null;
  }

  // Return top scoring identity
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];

  return {
    identity: top.identity,
    score: top.score,
    message: top.message,
  };
}

/**
 * Log identity resonance link
 */
export async function logIdentityResonance(
  userId: string,
  identity: Identity,
  sourceType: string,
  sourceId: string,
  resonanceScore: number,
  contextTags?: string[]
): Promise<void> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  await supabaseAdmin.from("identity_resonance_links").insert({
    user_id: dbUserId,
    identity_id: identity.id,
    identity_name: identity.name,
    source_type: sourceType,
    source_id: sourceId,
    resonance_score: resonanceScore,
    context_tags: contextTags || [],
  });
}

