// World State Builder - Pulls from existing Pulse modules
// lib/agi/worldstate.ts

import { WorldState, AGIUserId } from "./types";
import { supabaseAdmin } from "@/lib/supabase";
import { getCurrentEmotionState } from "@/lib/emotion-os/server";
import { getDeals } from "@/lib/crm/deals";
import { getRelationships } from "@/lib/relationships/engine";

/**
 * Resolve Clerk ID to database user ID
 */
async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

/**
 * Build comprehensive world state from all Pulse modules
 */
export async function buildWorldState(userId: AGIUserId): Promise<WorldState> {
  const dbUserId = await resolveUserId(userId);
  const now = new Date().toISOString();
  
  // Get user timezone from profile if available
  let timezone = "America/New_York"; // Default fallback
  try {
    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("timezone")
      .eq("user_id", dbUserId)
      .maybeSingle();
    if (profile?.timezone) {
      timezone = profile.timezone;
    }
  } catch {
    // Profile table may not exist or timezone not set - use default
  }

  // Fetch tasks
  const { data: allTasks } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("user_id", dbUserId)
    .in("status", ["pending", "in_progress"]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  const overdueTasks = (allTasks || []).filter((t) => {
    if (!t.due_date) return false;
    const dueDate = new Date(t.due_date);
    return dueDate < today && t.status !== "done";
  });

  const todayTasks = (allTasks || []).filter((t) => {
    if (!t.due_date) return false;
    const dueDateStr = new Date(t.due_date).toISOString().split("T")[0];
    return dueDateStr === todayStr;
  });

  // Fetch calendar events with perception features
  let upcomingEvents: any[] = [];
  let dayFeatures: any = null;
  try {
    const { analyzeCalendarEvents, analyzeDayFeatures } = await import("@/lib/agi/perception/calendar");
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const events = await analyzeCalendarEvents(userId, today, tomorrow);
    upcomingEvents = events;

    // Analyze today's day features
    dayFeatures = await analyzeDayFeatures(userId, today);
  } catch (err: any) {
    // Fallback to basic calendar fetch
    try {
      const { data: events } = await supabaseAdmin
        .from("calendar_events")
        .select("*")
        .eq("user_id", dbUserId)
        .gte("start_time", now)
        .order("start_time", { ascending: true })
        .limit(10);

      upcomingEvents = events || [];
    } catch (fallbackErr: any) {
      if (fallbackErr.code !== "42P01") {
        console.warn("Calendar events fetch failed:", fallbackErr.message);
      }
    }
  }

  // Fetch deals
  let activeDeals: any[] = [];
  let keyDeadlines: any[] = [];
  try {
    const deals = await getDeals(userId);
    activeDeals = deals.filter((d) => !["won", "lost"].includes(d.stage));
    
    // Extract deadlines from deals
    keyDeadlines = deals
      .filter((d) => d.close_date)
      .map((d) => ({
        id: d.id,
        title: d.name,
        dueDate: d.close_date,
        type: "deal",
      }));
  } catch (err) {
    console.error("Failed to fetch deals:", err);
  }

  // Fetch blocked tasks (tasks with dependencies)
  const blockedItems = (allTasks || []).filter((t) => {
    // Check if task has blockers (depends_on field or similar)
    return t.depends_on && Array.isArray(t.depends_on) && t.depends_on.length > 0;
  });

  // Fetch relationships
  let importantContacts: any[] = [];
  let atRiskRelationships: any[] = [];
  let checkinsDue: any[] = [];
  
  try {
    const relationships = await getRelationships(userId, {
      importance: [4, 5],
      limit: 20,
    });

    importantContacts = relationships.map((r) => ({
      id: r.id,
      name: r.name,
      importance: r.importance,
      lastInteraction: r.lastInteractionAt,
    }));

    // Check relationship health for at-risk
    const { data: healthScores } = await supabaseAdmin
      .from("crm_relationship_health")
      .select("contact_id, score, last_interaction_at")
      .eq("user_id", dbUserId)
      .lt("score", 50)
      .limit(10);

    atRiskRelationships = healthScores || [];

    // Check for check-ins due
    const { data: checkins } = await supabaseAdmin
      .from("crm_relationship_health")
      .select("contact_id, next_suggested_checkin_at")
      .eq("user_id", dbUserId)
      .lte("next_suggested_checkin_at", now)
      .limit(10);

    checkinsDue = checkins || [];
  } catch (err) {
    console.error("Failed to fetch relationships:", err);
  }

  // Fetch finance data
  // TEMP STUB: Finance module integration pending - bills table may not exist
  let cashflowSummary: any = null;
  let upcomingBills: any[] = [];
  let anomalies: any[] = [];
  
  try {
    const { data: bills } = await supabaseAdmin
      .from("bills")
      .select("*")
      .eq("user_id", dbUserId)
      .gte("due_date", todayStr)
      .order("due_date", { ascending: true })
      .limit(10);

    upcomingBills = bills || [];
  } catch (err: any) {
    // Finance tables may not exist - safe to ignore
    if (err.code !== "42P01") {
      console.warn("Finance data fetch failed:", err.message);
    }
  }

  // Fetch habits/health
  // TEMP STUB: No habits engine yet - safe to ignore
  let habits: any[] = [];
  let streaks: any[] = [];
  let riskSignals: any[] = [];
  
  try {
    const { data: habitData } = await supabaseAdmin
      .from("habits")
      .select("*")
      .eq("user_id", dbUserId)
      .limit(20);

    habits = habitData || [];
  } catch (err: any) {
    // Habits table may not exist - safe to ignore
    if (err.code !== "42P01") {
      console.warn("Habits data fetch failed:", err.message);
    }
  }

  // Fetch identity data - integrate Identity Engine v3
  let identityRoles: string[] = [];
  let identityPriorities: string[] = [];
  let values: string[] = [];
  let identityArchetype: string | undefined;
  let identityStrengths: string[] = [];
  let identityBlindspots: string[] = [];
  
  try {
    // Try Identity Engine v3 first
    try {
      const { scanIdentity } = await import("@/lib/identity/v3/identity-scanner");
      const { getWorkCortexContextForUser } = await import("@/lib/cortex/context");
      const cortexCtx = await getWorkCortexContextForUser(userId);
      const identityProfile = await scanIdentity(userId, cortexCtx);
      
      identityArchetype = identityProfile.currentArchetype;
      identityStrengths = identityProfile.strengths || [];
      identityBlindspots = identityProfile.blindspots || [];
      
      // Extract roles from secondary archetypes
      identityRoles = [identityProfile.currentArchetype, ...identityProfile.secondaryArchetypes];
      
      // Extract priorities from growth edges and transformation arc
      identityPriorities = [
        ...identityProfile.growthEdges,
        ...(identityProfile.transformationArc ? [`Transform to ${identityProfile.transformationArc.to}`] : []),
      ];
    } catch (v3Err) {
      // Fallback to older identity system
      try {
        const { getIdentityProfile } = await import("@/lib/identity-engine");
        const profile = await getIdentityProfile(userId);
        
        identityRoles = profile.roles?.map((r: any) => r.role_name || r.name) || [];
        values = profile.values?.map((v: any) => v.value_name || v.name) || [];
        identityPriorities = profile.aspirations?.map((a: any) => a.title) || [];
      } catch (legacyErr) {
        // Final fallback: try identity_profiles table
        const { data: identityProfile } = await supabaseAdmin
          .from("identity_profiles")
          .select("current_archetype, roles, priorities, values")
          .eq("user_id", dbUserId)
          .maybeSingle();

        if (identityProfile) {
          identityRoles = identityProfile.roles || [];
          identityPriorities = identityProfile.priorities || [];
          values = identityProfile.values || [];
          identityArchetype = identityProfile.current_archetype;
        }
      }
    }
  } catch (err: any) {
    // Identity systems may not exist - safe to ignore
    if (err.code !== "42P01") {
      console.warn("Identity data fetch failed:", err.message);
    }
  }

  // Fetch emotion state
  let emotionState: string | undefined;
  let emotionTrend: string | undefined;
  
  try {
    const emotion = await getCurrentEmotionState(userId);
    if (emotion) {
      emotionState = emotion.detected_emotion || undefined;
      
      // Calculate trend from recent states
      const { data: recentStates } = await supabaseAdmin
        .from("emo_states")
        .select("intensity, detected_emotion, occurred_at")
        .eq("user_id", dbUserId)
        .order("occurred_at", { ascending: false })
        .limit(7);
      
      if (recentStates && recentStates.length >= 3) {
        const recentAvg = recentStates.slice(0, 3).reduce((sum, e) => sum + (e.intensity || 0.5), 0) / 3;
        const olderAvg = recentStates.slice(3, 6).reduce((sum, e) => sum + (e.intensity || 0.5), 0) / Math.max(1, recentStates.length - 3);
        if (recentAvg > olderAvg + 0.1) emotionTrend = "rising";
        else if (recentAvg < olderAvg - 0.1) emotionTrend = "falling";
        else emotionTrend = "stable";
      }
    }
  } catch (err) {
    console.error("Failed to fetch emotion state:", err);
  }

  // Get AGI settings
  const { data: agiSettings } = await supabaseAdmin
    .from("user_agi_settings")
    .select("level")
    .eq("user_id", dbUserId)
    .maybeSingle();

  // Discover routines
  let routineProfile: any = null;
  try {
    const { discoverRoutines } = await import("@/lib/agi/perception/routines");
    routineProfile = await discoverRoutines(userId, 4);
  } catch (err) {
    console.warn("Routine discovery failed:", err);
  }

  // Build next-state predictions (will be computed after world state is built)

  // Build email perception
  let emailPerception: any = null;
  try {
    const { buildEmailPerception } = await import("@/lib/agi/perception/email");
    emailPerception = await buildEmailPerception(userId);
  } catch (err: any) {
    console.warn("[WorldState] Email perception failed:", err.message);
  }

  // Build finance perception
  let financePerception: any = null;
  try {
    const { buildFinancePerception } = await import("@/lib/agi/perception/finance");
    financePerception = await buildFinancePerception(userId);
  } catch (err: any) {
    console.warn("[WorldState] Finance perception failed:", err.message);
  }

  // Build relationship perception
  let relationshipPerception: any = null;
  try {
    const { buildRelationshipPerception } = await import("@/lib/agi/perception/relationships");
    relationshipPerception = await buildRelationshipPerception(userId);
  } catch (err: any) {
    console.warn("[WorldState] Relationship perception failed:", err.message);
  }

  return {
    userId,
    time: {
      now,
      timezone,
      upcomingEvents,
      dayFeatures, // Overload, fragmentation, opportunity blocks
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        name: t.name,
        dueDate: t.due_date,
        priority: t.priority,
      })),
      todayTasks: todayTasks.map((t) => ({
        id: t.id,
        name: t.name,
        dueDate: t.due_date,
        priority: t.priority,
      })),
    },
    work: {
      activeDeals: activeDeals.map((d) => ({
        id: d.id,
        name: d.name,
        stage: d.stage,
        closeDate: d.close_date,
        amount: d.amount,
      })),
      keyDeadlines,
      blockedItems: blockedItems.map((t) => ({
        id: t.id,
        name: t.name,
        blockers: t.depends_on,
      })),
    },
    relationships: {
      importantContacts: relationshipPerception?.importantContacts || importantContacts.map((c: any) => ({
        id: c.id || c.contact_id,
        name: c.name || "Unknown",
        relationshipScore: c.relationshipScore || c.score,
        daysSinceInteraction: c.daysSinceInteraction || 0,
      })),
      atRiskRelationships: relationshipPerception?.atRiskRelationships || atRiskRelationships.map((r) => ({
        id: r.contact_id,
        name: r.contact_name || "Unknown",
        relationshipScore: r.score,
        daysSinceInteraction: r.days_since_interaction || 0,
      })),
      checkinsDue: relationshipPerception?.checkinsDue || checkinsDue.map((c) => ({
        id: c.contact_id,
        name: c.contact_name || "Unknown",
        relationshipScore: c.score,
        daysSinceInteraction: c.days_since_interaction || 0,
      })),
      relationshipDrift: relationshipPerception?.atRiskRelationships?.length
        ? relationshipPerception.atRiskRelationships.reduce((sum: number, r: any) => sum + (r.driftScore || 0), 0) /
          relationshipPerception.atRiskRelationships.length
        : undefined,
    },
    finances: {
      cashflowSummary,
      upcomingBills: financePerception?.upcomingBills || upcomingBills.map((b) => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        dueDate: b.due_date,
      })),
      anomalies: financePerception?.anomalies || anomalies,
      spendingDrift: financePerception?.spendingDrift,
      stressSignals: financePerception?.stressSignals || [],
    },
    email: emailPerception || {
      urgentThreads: [],
      waitingOnUser: [],
      waitingOnOthers: [],
      riskThreads: [],
      opportunities: [],
    },
    habitsAndHealth: {
      habits,
      streaks,
      riskSignals,
    },
    identity: {
      roles: identityRoles,
      priorities: identityPriorities,
      values,
      archetype: identityArchetype,
      strengths: identityStrengths,
      blindspots: identityBlindspots,
    },
    emotion: {
      currentState: emotionState,
      recentTrend: emotionTrend,
    },
    meta: {
      lastRunAt: undefined,
      agiLevel: (agiSettings?.level as "off" | "assist" | "autopilot") || "assist",
      routineProfile, // Best focus windows, avoidance patterns, etc.
    },
  };

  // Generate next-state predictions now that world state is built
  try {
    const { predictNextState } = await import("@/lib/agi/prediction/next_state");
    world.predictions = predictNextState(world);
  } catch (err: any) {
    console.warn("[WorldState] Prediction failed:", err.message);
  }

  // Enrich with memory graph data
  try {
    // Get key people nodes
    const { data: peopleNodes } = await supabaseAdmin
      .from('tb_nodes')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('type', 'person')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get key project/deal nodes
    const { data: projectNodes } = await supabaseAdmin
      .from('tb_nodes')
      .select('*')
      .eq('user_id', dbUserId)
      .in('type', ['deal', 'project'])
      .order('created_at', { ascending: false })
      .limit(10);

    // Get recent highlights (important events)
    const { data: highlightNodes } = await supabaseAdmin
      .from('tb_nodes')
      .select('*')
      .eq('user_id', dbUserId)
      .in('type', ['call', 'experiment', 'emotion_state'])
      .order('started_at', { ascending: false })
      .limit(5);

    // Get current chapter
    const now = new Date().toISOString().split('T')[0];
    const { data: currentChapter } = await supabaseAdmin
      .from('tb_chapters')
      .select('*')
      .eq('user_id', dbUserId)
      .lte('period_start', now)
      .gte('period_end', now)
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    world.memoryGraph = {
      keyPeople: (peopleNodes || []).map((n: any) => ({
        id: n.id,
        name: n.props?.name || 'Unknown',
        role: n.props?.role,
      })),
      keyProjects: (projectNodes || []).map((n: any) => ({
        id: n.id,
        name: n.props?.name || 'Unknown',
        status: n.props?.status,
      })),
      recentHighlights: (highlightNodes || []).map((n: any) => ({
        id: n.id,
        type: n.type,
        summary: n.props?.summary || n.props?.name,
      })),
      currentChapter: currentChapter
        ? {
            title: currentChapter.title,
            summary: currentChapter.summary_md.slice(0, 200),
            tags: currentChapter.tags || [],
          }
        : undefined,
    };
  } catch (err: any) {
    // Graph tables may not exist yet - that's okay
    if (err.code !== '42P01') {
      console.warn("[WorldState] Memory graph enrichment failed:", err.message);
    }
  }

  return world;
}

