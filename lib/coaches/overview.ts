import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emptyOverview } from "@/lib/shared/overview";

export async function getCoachesOverview(clerkUserId: string) {
  try {
    // Resolve Clerk ID to database UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    const dbUserId = userRow?.id || clerkUserId;

    // Get available coaches from coaching catalog
    // Note: This is a simplified version - adjust based on actual coach data structure
    const { data: coaches } = await supabaseAdmin
      .from("coaching_sessions")
      .select("coach_type, id, created_at")
      .eq("user_id", dbUserId)
      .order("created_at", { ascending: false })
      .limit(20);

    // Count unique coach types
    const coachTypes = new Set(coaches?.map((c) => c.coach_type) || []);
    const availableCoachesCount = coachTypes.size;

    // Get recommended coach (simplified - would need more logic for actual recommendation)
    const recommendedCoach = coachTypes.size > 0 ? Array.from(coachTypes)[0] : "No coaches available";

    // Build coach list for items
    const coachList = Array.from(coachTypes).map((type) => ({
      id: type,
      name: type,
      type,
      href: `/coaches/${type}`,
    }));

    return {
      ok: true,
      module: "coaches",
      summary: `${availableCoachesCount} available coaches | Recommended: ${recommendedCoach}`,
      cards: [
        {
          title: "Available Coaches",
          value: availableCoachesCount,
          subtitle: "Specialized coaching lenses",
          state: availableCoachesCount > 0 ? "good" : "empty",
        },
        {
          title: "Recommended Coach",
          value: recommendedCoach,
          subtitle: "Based on your context",
          state: recommendedCoach !== "No coaches available" ? "good" : "empty",
          cta: recommendedCoach !== "No coaches available" ? { label: "Start Session", href: `/coaches/${recommendedCoach}` } : undefined,
        },
      ],
      items: coachList,
      meta: { availableCoachesCount, recommendedCoach },
    };
  } catch (err) {
    console.error("[CoachesOverview] Error:", err);
    // Return a basic coach list if table doesn't exist
    return {
      ok: true,
      module: "coaches",
      summary: "Coaching system available",
      cards: [
        {
          title: "Available Coaches",
          value: 0,
          subtitle: "Specialized coaching lenses",
          state: "empty",
        },
        {
          title: "Recommended Coach",
          subtitle: "Start a coaching session",
          state: "empty",
          cta: { label: "Browse Coaches", href: "/coaches" },
        },
      ],
      items: [
        { id: "deal-coach", name: "Deal Coach", href: "/deal-coach" },
        { id: "career-coach", name: "Career Coach", href: "/career-coach" },
        { id: "roleplay-coach", name: "Roleplay Coach", href: "/roleplay-coach" },
      ],
      meta: {},
    };
  }
}

