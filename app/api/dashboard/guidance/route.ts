// GET /api/dashboard/guidance
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import { GuidanceCard, EmotionalState } from "@/types/dashboard";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

export async function GET(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Get profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Infer emotional state from recent telemetry
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: recentEvents } = await supabase
      .from("dashboard_telemetry_events")
      .select("*")
      .eq("user_id", userId)
      .gte("created_at", twoHoursAgo);

    const emotionalState = inferEmotionalState(recentEvents || []);
    const adjustments = getStateAdjustments(emotionalState);

    // Build guidance cards
    const cards: GuidanceCard[] = [];
    let cardId = 0;

    // State awareness card
    if (emotionalState !== "CALM") {
      cards.push(createStateCard(emotionalState, ++cardId));
    }

    // Top priorities
    cards.push({
      id: `guidance-${++cardId}`,
      title: adjustments.showSingleNextAction ? "Your one focus" : "Today's priorities",
      body: adjustments.showSingleNextAction
        ? "→ Check your most important task"
        : "1. Review your tasks\n2. Check follow-ups\n3. Update your contacts",
      priority: 2,
      source: "TASKS",
      dismissible: false,
      ctaLabel: "View tasks",
      ctaAction: "/tasks",
    });

    // Coach suggestion
    if (emotionalState === "OVERWHELMED" || emotionalState === "LOW") {
      cards.push({
        id: `guidance-${++cardId}`,
        title: "Talk it out?",
        body: "Sometimes a quick chat helps. Your AI coach is ready.",
        priority: 3,
        source: "COACHING",
        dismissible: true,
        ctaLabel: "Start session",
        ctaAction: "/coaches",
      });
    }

    // Focus mode offer
    if (adjustments.offerFocusMode) {
      cards.push({
        id: `guidance-${++cardId}`,
        title: "Try Focus Mode?",
        body: "Hide distractions and zero in on what matters.",
        priority: 4,
        source: "SYSTEM",
        dismissible: true,
        ctaLabel: "Enable",
        ctaAction: "FOCUS_MODE_TOGGLE",
      });
    }

    return NextResponse.json({ cards, emotionalState, adjustments });
  } catch (error) {
    console.error("[Guidance]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

function inferEmotionalState(events: any[]): EmotionalState {
  if (!events.length) return "CALM";

  const dismissals = events.filter((e) => e.event_type === "DISMISS").length;
  const opens = events.filter((e) => e.event_type === "OPEN").length;

  if (opens > 0 && dismissals / opens > 0.5) return "OVERWHELMED";
  if (opens > 20) return "HYPED";
  if (events.some((e) => e.event_type === "FOCUS_MODE_TOGGLE")) return "FOCUSED";

  return "CALM";
}

function getStateAdjustments(state: EmotionalState) {
  const base = { showSingleNextAction: false, offerFocusMode: false, toneAdjustment: "normal" };

  if (state === "OVERWHELMED") return { showSingleNextAction: true, offerFocusMode: true, toneAdjustment: "gentle" };
  if (state === "LOW") return { showSingleNextAction: false, offerFocusMode: false, toneAdjustment: "encouraging" };
  if (state === "FOCUSED") return { showSingleNextAction: true, offerFocusMode: false, toneAdjustment: "minimal" };

  return base;
}

function createStateCard(state: EmotionalState, id: number): GuidanceCard {
  const messages: Record<EmotionalState, { title: string; body: string }> = {
    OVERWHELMED: { title: "Let's simplify", body: "I've reduced the dashboard to essentials. Focus on one thing." },
    LOW: { title: "I'm here for you", body: "Energy is low today. That's okay. Small wins count." },
    HYPED: { title: "You're on fire! 🔥", body: "Great time to tackle something ambitious." },
    FOCUSED: { title: "Deep work mode", body: "You're in the zone. Keeping interruptions minimal." },
    CALM: { title: "Ready to go", body: "Balanced and ready." },
  };

  const msg = messages[state];
  return {
    id: `guidance-${id}`,
    title: msg.title,
    body: msg.body,
    priority: 1,
    source: "SYSTEM",
    dismissible: true,
  };
}
