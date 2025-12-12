// Coach Context Loader
// lib/coaches/context.ts

import { supabaseAdmin } from "@/lib/supabase";
import { CoachContextPack, CoachScenario, CoachUserPreferences, CoachDifficulty } from "./types";

export async function buildCoachContextPack(params: {
  userId: string;
  coachId: string;                         // 'sales', 'career', ...
  activeScenarioType?: string;            // e.g. 'sales:vehicle_price_objection'
  activeObjectId?: string | null;         // deal/contact id, optional
}): Promise<CoachContextPack> {
  const { userId, coachId, activeScenarioType } = params;

  // 1) Get user from users table (Clerk ID mapping)
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id, name, clerk_id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // 2) Get user profile (if exists)
  const { data: profileRow } = await supabaseAdmin
    .from("user_profiles")
    .select("name, job_title_id")
    .eq("user_id", dbUserId)
    .single();

  // 3) Learning history (Second Brain / Dojo)
  // Try to get lessons from philosophy_dojo_lessons or similar
  // For now, we'll query coach_training_sessions as a proxy
  const { data: sessions } = await supabaseAdmin
    .from("coach_training_sessions")
    .select("id, created_at, scenario_type, skill_nodes, success_rating, key_takeaways")
    .eq("user_id", dbUserId)
    .eq("coach_id", coachId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Try to get philosophy dojo lessons if table exists
  let completedLessons: CoachContextPack["learningHistory"]["completedLessons"] = [];
  try {
    const { data: dojoLessons } = await supabaseAdmin
      .from("philosophy_dojo_lessons")
      .select("id, title, completed_at, tags, key_takeaways")
      .eq("user_id", dbUserId)
      .order("completed_at", { ascending: false })
      .limit(10);

    if (dojoLessons) {
      completedLessons = dojoLessons.map((l: any) => ({
        id: l.id,
        title: l.title || "Untitled Lesson",
        completedAt: l.completed_at || new Date().toISOString(),
        tags: l.tags || [],
        keyTakeaways: l.key_takeaways || undefined,
      }));
    }
  } catch (e) {
    // Table might not exist, that's okay
    console.log("[CoachContext] Philosophy dojo lessons table not found, skipping");
  }

  // 4) Third Brain insights
  let currentChapters: string[] = [];
  let keyTrends: string[] = [];

  try {
    // Try to get narrative chapters
    const { data: chapters } = await supabaseAdmin
      .from("id_narrative_chapters")
      .select("chapter_title")
      .eq("user_id", dbUserId)
      .order("chapter_order", { ascending: false })
      .limit(5);

    if (chapters) {
      currentChapters = chapters.map((c: any) => c.chapter_title || "");
    }
  } catch (e) {
    console.log("[CoachContext] Narrative chapters table not found, skipping");
  }

  try {
    // Try to get third brain insights
    const { data: insights } = await supabaseAdmin
      .from("third_brain_insights")
      .select("title, description")
      .eq("user_id", dbUserId)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(5);

    if (insights) {
      keyTrends = insights.map((i: any) => i.title || i.description || "").filter(Boolean);
    }
  } catch (e) {
    console.log("[CoachContext] Third brain insights table not found, skipping");
  }

  // 5) Active scenario summary (optional, basic RAG)
  let activeScenario: CoachContextPack["activeScenario"] | undefined = undefined;
  if (activeScenarioType && params.activeObjectId) {
    // Example for a deal; customize as needed.
    try {
      const { data: deal } = await supabaseAdmin
        .from("deals")
        .select("id, name, amount, stage, notes")
        .eq("id", params.activeObjectId)
        .single();

      if (deal) {
        activeScenario = {
          scenarioType: activeScenarioType,
          summary: `Deal "${deal.name}" - amount ${deal.amount}, stage ${deal.stage}. Notes: ${deal.notes ?? "none"}.`,
          dealId: deal.id,
        };
      }
    } catch (e) {
      console.log("[CoachContext] Deals table not found or error, skipping active scenario");
    }
  }

  // v2.5: Load preferences and derive difficulty
  const preferences = await loadCoachUserPreferences(dbUserId, coachId);
  const difficultyLevel = await deriveCoachDifficultyLevel(dbUserId, coachId, preferences);

  // v2.5: Calculate recent performance summary
  const recentPerformanceSummary = await calculateRecentPerformance(dbUserId, coachId);

  return {
    userProfile: {
      id: dbUserId,
      name: profileRow?.name || userRow?.name || null,
      role: null, // TODO: get from job_titles if needed
      company: null, // TODO: get from profile if exists
      jobModelId: profileRow?.job_title_id || null,
    },
    learningHistory: {
      completedLessons,
      activeTracks: [],        // TODO: query philosophy/dojo tracks
      lastSessions:
        sessions?.map((s: any) => ({
          id: s.id,
          createdAt: s.created_at,
          scenarioType: s.scenario_type,
          skillNodes: s.skill_nodes || [],
          successRating: s.success_rating,
          keyTakeaways: s.key_takeaways || undefined,
        })) || [],
    },
    thirdBrainInsights: {
      currentChapters,
      keyTrends,
    },
    activeScenario,
    // v2.5: Added fields
    difficultyLevel,
    preferences,
    recentPerformanceSummary,
  };
}

// v2.5: Load user preferences for a coach type
export async function loadCoachUserPreferences(
  userId: string,
  coachType: string
): Promise<CoachUserPreferences | null> {
  try {
    const { data } = await supabaseAdmin
      .from("coach_user_preferences")
      .select("coach_type, tone, difficulty_pref")
      .eq("user_id", userId)
      .eq("coach_type", coachType)
      .single();

    if (data) {
      return {
        coachType: data.coach_type,
        tone: data.tone as CoachUserPreferences["tone"],
        difficultyPref: data.difficulty_pref as CoachUserPreferences["difficultyPref"],
      };
    }
  } catch (e) {
    // Table might not exist or no preferences set
    console.log("[CoachContext] No preferences found, using defaults");
  }

  // Return default preferences
  return {
    coachType,
    tone: "supportive",
    difficultyPref: "auto",
  };
}

// v2.5: Load scenario from library
export async function loadScenarioForCoach(
  coachType: string,
  opts?: {
    difficulty?: CoachDifficulty;
    topicTag?: string;
    scenarioId?: string;
  }
): Promise<CoachScenario | null> {
  try {
    let query = supabaseAdmin
      .from("coach_scenarios")
      .select("*")
      .eq("coach_type", coachType);

    if (opts?.scenarioId) {
      query = query.eq("id", opts.scenarioId);
    } else {
      if (opts?.difficulty) {
        query = query.eq("difficulty", opts.difficulty);
      }
      if (opts?.topicTag) {
        query = query.contains("topic_tags", [opts.topicTag]);
      }
    }

    const { data } = await query.limit(1).maybeSingle();

    if (data) {
      return {
        id: data.id,
        coachType: data.coach_type,
        title: data.title,
        description: data.description || undefined,
        difficulty: data.difficulty as CoachDifficulty,
        topicTags: data.topic_tags || [],
        customerProfile: data.customer_profile || undefined,
        constraints: data.constraints || undefined,
        initialPrompt: data.initial_prompt || undefined,
      };
    }
  } catch (e) {
    console.log("[CoachContext] Error loading scenario:", e);
  }

  return null;
}

// v2.5: Derive difficulty level based on preferences and performance
export async function deriveCoachDifficultyLevel(
  userId: string,
  coachType: string,
  prefs: CoachUserPreferences | null
): Promise<CoachDifficulty> {
  // If user has a fixed preference, use it
  if (prefs && prefs.difficultyPref !== "auto") {
    return prefs.difficultyPref as CoachDifficulty;
  }

  // Auto mode: analyze recent performance
  try {
    const { data: sessions } = await supabaseAdmin
      .from("coach_training_sessions")
      .select("performance_score")
      .eq("user_id", userId)
      .eq("coach_id", coachType)
      .not("performance_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!sessions || sessions.length === 0) {
      return "beginner";
    }

    const scores = sessions.map((s: any) => parseFloat(s.performance_score || "0"));
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sessionsCount = sessions.length;

    // Simple progression rules
    if (averageScore >= 85 && sessionsCount >= 5) {
      // High performer with enough practice -> advance
      const currentLevel = sessions[0]?.difficulty || "beginner";
      const levels: CoachDifficulty[] = ["beginner", "intermediate", "advanced", "expert"];
      const currentIndex = levels.indexOf(currentLevel as CoachDifficulty);
      if (currentIndex < levels.length - 1) {
        return levels[currentIndex + 1];
      }
      return "expert";
    } else if (averageScore <= 40 && sessionsCount >= 3) {
      // Struggling -> reduce difficulty
      const currentLevel = sessions[0]?.difficulty || "intermediate";
      const levels: CoachDifficulty[] = ["beginner", "intermediate", "advanced", "expert"];
      const currentIndex = levels.indexOf(currentLevel as CoachDifficulty);
      if (currentIndex > 0) {
        return levels[currentIndex - 1];
      }
      return "beginner";
    }

    // Default: use the difficulty from the most recent session, or beginner
    return (sessions[0]?.difficulty as CoachDifficulty) || "beginner";
  } catch (e) {
    console.log("[CoachContext] Error deriving difficulty:", e);
    return "beginner";
  }
}

// v2.5: Calculate recent performance summary
async function calculateRecentPerformance(
  userId: string,
  coachType: string
): Promise<CoachContextPack["recentPerformanceSummary"] | undefined> {
  try {
    const { data: sessions } = await supabaseAdmin
      .from("coach_training_sessions")
      .select("performance_score")
      .eq("user_id", userId)
      .eq("coach_id", coachType)
      .not("performance_score", "is", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (!sessions || sessions.length === 0) {
      return undefined;
    }

    const scores = sessions.map((s: any) => parseFloat(s.performance_score || "0"));
    const averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    const lastScore = scores[0];

    return {
      averageScore: Math.round(averageScore * 100) / 100,
      lastScore: Math.round(lastScore * 100) / 100,
      sessionsCount: sessions.length,
    };
  } catch (e) {
    return undefined;
  }
}

