// Identity API
// GET /api/identity - Get user's identity profile

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

// Archetype definitions
const ARCHETYPES = {
  Warrior: {
    icon: "⚔️",
    traits: ["Discipline", "Courage", "Resilience"],
    dailyActions: [
      "Do one thing that scares you today",
      "Complete your hardest task first",
      "Push through discomfort in one area",
      "Stand firm on a boundary",
    ],
  },
  Sage: {
    icon: "📚",
    traits: ["Wisdom", "Clarity", "Patience"],
    dailyActions: [
      "Read for 15 minutes",
      "Teach someone something you know",
      "Reflect before responding",
      "Journal your insights from today",
    ],
  },
  Creator: {
    icon: "🎨",
    traits: ["Creativity", "Vision", "Expression"],
    dailyActions: [
      "Create something, however small",
      "Try a new approach to an old problem",
      "Share your work with someone",
      "Spend 10 minutes in pure imagination",
    ],
  },
  Leader: {
    icon: "👑",
    traits: ["Influence", "Responsibility", "Vision"],
    dailyActions: [
      "Make a decision you've been avoiding",
      "Recognize someone's contribution",
      "Communicate your vision clearly",
      "Take responsibility for something",
    ],
  },
  Healer: {
    icon: "💚",
    traits: ["Empathy", "Compassion", "Support"],
    dailyActions: [
      "Check in on someone who might need support",
      "Practice self-compassion",
      "Listen deeply without trying to fix",
      "Offer help without being asked",
    ],
  },
  Explorer: {
    icon: "🧭",
    traits: ["Curiosity", "Adaptability", "Discovery"],
    dailyActions: [
      "Try something new today",
      "Ask a question you've been curious about",
      "Take a different route or approach",
      "Talk to someone outside your usual circle",
    ],
  },
};

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Get XP for level calculation
    const { data: xpData } = await supabase
      .from("xp_transactions")
      .select("amount")
      .eq("user_id", userId);

    const totalXP = (xpData || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const level = Math.floor(totalXP / 1000) + 1;
    const xpToNext = 1000 - (totalXP % 1000);

    // Determine archetype (from profile or default)
    const archetypeName = profile?.archetype || "Explorer";
    const archetype = ARCHETYPES[archetypeName as keyof typeof ARCHETYPES] || ARCHETYPES.Explorer;

    // Select random daily action
    const dailyAction = archetype.dailyActions[Math.floor(Math.random() * archetype.dailyActions.length)];

    // Calculate trait progress (would be based on actual tracking)
    const traits = archetype.traits.map((trait, i) => ({
      name: trait,
      progress: Math.min(100, Math.floor((totalXP / 50) + (i * 10)) % 100),
    }));

    return NextResponse.json({
      identity: {
        archetype: archetypeName,
        icon: archetype.icon,
        traits,
        dailyAction,
        level,
        xpToNext,
        totalXP,
      },
    });

  } catch (err: any) {
    console.error("Identity API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Update archetype
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { archetype } = await req.json();

    if (!ARCHETYPES[archetype as keyof typeof ARCHETYPES]) {
      return NextResponse.json({ error: "Invalid archetype" }, { status: 400 });
    }

    await supabase
      .from("user_profiles")
      .upsert({
        user_id: userId,
        archetype,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id" });

    return NextResponse.json({ success: true, archetype });

  } catch (err: any) {
    console.error("Identity update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}