// Identity Growth Tracker
// lib/identity/growth.ts

import { supabaseAdmin } from "@/lib/supabase";
import { Identity } from "./resonance";

export interface IdentitySnapshotInput {
  userId: string;
  date: Date;
}

/**
 * Compute identity snapshots for a date
 */
export async function computeIdentitySnapshotsForDate(
  params: IdentitySnapshotInput
): Promise<void> {
  const { userId, date } = params;

  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Load user identities
  const identities = await loadUserIdentities(userId);

  if (identities.length === 0) {
    console.log("[IdentityGrowth] No identities found for user");
    return;
  }

  const snapshotDate = date.toISOString().split("T")[0];
  const sevenDaysAgo = new Date(date);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const fourteenDaysAgo = new Date(date);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  for (const identity of identities) {
    // 1. Sum XP (MXP or identity-tagged XP) up to date
    const { data: xpRecords } = await supabaseAdmin
      .from("xp_ledger")
      .select("amount, category")
      .eq("user_id", dbUserId)
      .lte("created_at", date.toISOString())
      .or("category.eq.MXP,metadata->>identity_name.eq." + identity.name);

    const xpTotal = (xpRecords || []).reduce((sum, r) => sum + (r.amount || 0), 0);

    // 2. Count sessions tagged with this identity
    const { data: resonanceLinks } = await supabaseAdmin
      .from("identity_resonance_links")
      .select("source_id")
      .eq("user_id", dbUserId)
      .eq("identity_name", identity.name)
      .lte("created_at", date.toISOString());

    const sessionsCount = new Set(resonanceLinks?.map((l) => l.source_id.split("_")[0]) || []).size;

    // 3. Determine dominant emotions from sessions in last 30 days
    const thirtyDaysAgo = new Date(date);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: turns } = await supabaseAdmin
      .from("coaching_turns")
      .select("emotion")
      .eq("user_id", dbUserId)
      .gte("created_at", thirtyDaysAgo.toISOString())
      .lte("created_at", date.toISOString())
      .not("emotion", "is", null);

    const emotionCounts = new Map<string, number>();
    (turns || []).forEach((t) => {
      if (t.emotion) {
        emotionCounts.set(t.emotion, (emotionCounts.get(t.emotion) || 0) + 1);
      }
    });

    const dominantEmotions = Array.from(emotionCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([emotion]) => emotion);

    // 4. Compute trend 7d: compare XP over last 7 days vs prior 7 days
    const { data: xpLast7d } = await supabaseAdmin
      .from("xp_ledger")
      .select("amount")
      .eq("user_id", dbUserId)
      .gte("created_at", sevenDaysAgo.toISOString())
      .lte("created_at", date.toISOString())
      .or("category.eq.MXP,metadata->>identity_name.eq." + identity.name);

    const { data: xpPrior7d } = await supabaseAdmin
      .from("xp_ledger")
      .select("amount")
      .eq("user_id", dbUserId)
      .gte("created_at", fourteenDaysAgo.toISOString())
      .lt("created_at", sevenDaysAgo.toISOString())
      .or("category.eq.MXP,metadata->>identity_name.eq." + identity.name);

    const xpLast7dTotal = (xpLast7d || []).reduce((sum, r) => sum + (r.amount || 0), 0);
    const xpPrior7dTotal = (xpPrior7d || []).reduce((sum, r) => sum + (r.amount || 0), 0);

    const xpTrend7d =
      xpPrior7dTotal > 0 ? ((xpLast7dTotal - xpPrior7dTotal) / xpPrior7dTotal) * 100 : 0;

    // 5. Upsert snapshot
    await supabaseAdmin
      .from("identity_state_snapshots")
      .upsert(
        {
          user_id: dbUserId,
          identity_id: identity.id,
          identity_name: identity.name,
          snapshot_date: snapshotDate,
          xp_total: xpTotal,
          xp_trend_7d: xpTrend7d,
          sessions_count: sessionsCount,
          emotions_dominant: dominantEmotions,
        },
        {
          onConflict: "user_id,identity_name,snapshot_date",
        }
      );
  }
}

/**
 * Helper: Load user identities
 */
async function loadUserIdentities(userId: string): Promise<Identity[]> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Try to load from identity tables
  try {
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
    // Fallback to default identities
  }

  // Default identities if none found
  return [
    { id: "default_warrior", name: "Warrior", tagline: "I do hard things", priority: 0 },
    { id: "default_strategist", name: "Strategist", tagline: "I plan and execute", priority: 1 },
  ];
}

