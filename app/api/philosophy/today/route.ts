// Philosophy Today API
// GET /api/philosophy/today - Get today's philosophical content

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { loadMentor } from "@/app/lib/brain-loader";



// Mentor definitions
const MENTORS = {
  marcus_aurelius: {
    name: "Marcus Aurelius",
    icon: "🏛️",
    path: "Stoicism",
    lessons: [
      "You have power over your mind - not outside events. Realize this, and you will find strength.",
      "The happiness of your life depends upon the quality of your thoughts.",
      "Waste no more time arguing about what a good man should be. Be one.",
      "When you arise in the morning, think of what a privilege it is to be alive.",
      "Accept the things to which fate binds you, and love the people with whom fate brings you together.",
    ],
    practices: [
      "Write down three things within your control today, and three things outside it.",
      "Practice negative visualization: imagine losing something you value, then appreciate having it.",
      "Before reacting to any frustration, pause and ask: 'Is this within my control?'",
      "End your day by reviewing your actions: what did you do well? What could improve?",
    ],
  },
  seneca: {
    name: "Seneca",
    icon: "📜",
    path: "Stoicism",
    lessons: [
      "It is not that we have a short time to live, but that we waste a lot of it.",
      "We suffer more often in imagination than in reality.",
      "Luck is what happens when preparation meets opportunity.",
      "Difficulties strengthen the mind, as labor does the body.",
    ],
    practices: [
      "Set aside 30 minutes for deep work with no distractions.",
      "Practice voluntary discomfort: skip a meal, take a cold shower, or work in silence.",
      "Write a letter to someone you're grateful for, even if you don't send it.",
      "Review your day and identify one moment of unnecessary suffering caused by imagination.",
    ],
  },
  lao_tzu: {
    name: "Lao Tzu",
    icon: "☯️",
    path: "Taoism",
    lessons: [
      "The journey of a thousand miles begins with a single step.",
      "Nature does not hurry, yet everything is accomplished.",
      "He who knows others is wise; he who knows himself is enlightened.",
      "The softest thing in the universe overcomes the hardest.",
    ],
    practices: [
      "Spend 10 minutes in nature, observing without judging.",
      "Practice Wu Wei: do one task by following the natural flow, without forcing.",
      "Sit in stillness for 5 minutes, letting thoughts pass like clouds.",
      "Approach one problem today with softness instead of force.",
    ],
  },
  buddha: {
    name: "Buddha",
    icon: "🧘",
    path: "Buddhism",
    lessons: [
      "The mind is everything. What you think, you become.",
      "Pain is certain, suffering is optional.",
      "In the end, only three things matter: how much you loved, how gently you lived, and how gracefully you let go.",
      "Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.",
    ],
    practices: [
      "Practice mindful breathing for 5 minutes: focus only on your breath.",
      "Notice one moment of suffering today and trace it to attachment.",
      "Perform one act of compassion for someone, expecting nothing in return.",
      "Before bed, release one thing you've been holding onto.",
    ],
  },
  musashi: {
    name: "Miyamoto Musashi",
    icon: "⚔️",
    path: "Way of the Warrior",
    lessons: [
      "There is nothing outside of yourself that can ever enable you to get better, stronger, richer, quicker, or smarter.",
      "Do nothing that is of no use.",
      "Think lightly of yourself and deeply of the world.",
      "The ultimate aim of martial arts is not having to use them.",
    ],
    practices: [
      "Eliminate one unnecessary activity from your day.",
      "Practice one skill deliberately for 20 minutes with full focus.",
      "Take one action that requires courage, however small.",
      "Review your day: did every action serve a purpose?",
    ],
  },
  goggins: {
    name: "David Goggins",
    icon: "🔥",
    path: "Mental Toughness",
    lessons: [
      "You are in danger of living a life so comfortable and soft that you will die without ever realizing your potential.",
      "When you think you're done, you're only at 40% of your capacity.",
      "Motivation is crap. Be driven.",
      "The only way to grow is to embrace suffering.",
    ],
    practices: [
      "Do something physically challenging that you've been avoiding.",
      "When you want to quit, push through for 10 more minutes.",
      "Wake up before you want to and start your day with discipline.",
      "Accountability mirror: look yourself in the eye and tell yourself the truth.",
    ],
  },
};

// Belt ranks based on XP
const BELT_RANKS = [
  { name: "White", minXP: 0 },
  { name: "Yellow", minXP: 500 },
  { name: "Orange", minXP: 1500 },
  { name: "Green", minXP: 3000 },
  { name: "Blue", minXP: 5000 },
  { name: "Purple", minXP: 8000 },
  { name: "Brown", minXP: 12000 },
  { name: "Black", minXP: 20000 },
];

function getBeltRank(xp: number): { name: string; progress: number } {
  let currentBelt = BELT_RANKS[0];
  let nextBelt = BELT_RANKS[1];
  
  for (let i = BELT_RANKS.length - 1; i >= 0; i--) {
    if (xp >= BELT_RANKS[i].minXP) {
      currentBelt = BELT_RANKS[i];
      nextBelt = BELT_RANKS[i + 1] || BELT_RANKS[i];
      break;
    }
  }
  
  const xpInBelt = xp - currentBelt.minXP;
  const xpNeeded = nextBelt.minXP - currentBelt.minXP;
  const progress = Math.min(100, Math.floor((xpInBelt / xpNeeded) * 100));
  
  return { name: currentBelt.name, progress };
}

export async function GET(req: NextRequest) {
  const supabase = getSupabaseAdminRuntimeClient();
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's philosophy profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("philosophy_mentor, philosophy_streak")
      .eq("user_id", userId)
      .single();

    // Get XP for belt calculation
    const { data: xpData } = await supabase
      .from("xp_transactions")
      .select("amount")
      .eq("user_id", userId)
      .eq("source", "philosophy");

    const philosophyXP = (xpData || []).reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const { name: beltRank, progress: xpProgress } = getBeltRank(philosophyXP);

    // Get mentor (default to Marcus Aurelius)
    const mentorId = profile?.philosophy_mentor || "marcus_aurelius";
    const mentor = MENTORS[mentorId as keyof typeof MENTORS] || MENTORS.marcus_aurelius;

    // Select today's lesson and practice based on day of year (consistent per day)
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    const lessonIndex = dayOfYear % mentor.lessons.length;
    const practiceIndex = dayOfYear % mentor.practices.length;

    // Try to load extended mentor content from brain
    let extendedContent = null;
    try {
      extendedContent = await loadMentor(mentorId);
    } catch (err) {
      console.log("Extended mentor content not available");
    }

    return NextResponse.json({
      currentPath: mentor.path,
      mentor: mentor.name,
      mentorIcon: mentor.icon,
      mentorId,
      todayLesson: mentor.lessons[lessonIndex],
      todayPractice: mentor.practices[practiceIndex],
      streak: profile?.philosophy_streak || 0,
      beltRank,
      xpProgress,
      philosophyXP,
      allMentors: Object.entries(MENTORS).map(([id, m]) => ({
        id,
        name: m.name,
        icon: m.icon,
        path: m.path,
      })),
    });

  } catch (err: any) {
    console.error("Philosophy API error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST - Update mentor or complete practice
export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdminRuntimeClient();
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, mentorId } = await req.json();

    if (action === "change_mentor" && mentorId) {
      if (!MENTORS[mentorId as keyof typeof MENTORS]) {
        return NextResponse.json({ error: "Invalid mentor" }, { status: 400 });
      }

      await supabase
        .from("user_profiles")
        .upsert({
          user_id: userId,
          philosophy_mentor: mentorId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      return NextResponse.json({ success: true, mentorId });
    }

    if (action === "complete_practice") {
      // Award XP
      await supabase.from("xp_transactions").insert({
        user_id: userId,
        amount: 25,
        source: "philosophy",
        description: "Completed daily philosophy practice",
      });

      // Update streak
      const today = new Date().toISOString().split("T")[0];
      
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("philosophy_streak, philosophy_last_practice")
        .eq("user_id", userId)
        .single();

      const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
      const lastPractice = profile?.philosophy_last_practice;
      
      let newStreak = 1;
      if (lastPractice === yesterday) {
        newStreak = (profile?.philosophy_streak || 0) + 1;
      } else if (lastPractice === today) {
        // Already practiced today
        return NextResponse.json({ success: true, alreadyCompleted: true });
      }

      await supabase
        .from("user_profiles")
        .upsert({
          user_id: userId,
          philosophy_streak: newStreak,
          philosophy_last_practice: today,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

      return NextResponse.json({ 
        success: true, 
        xpAwarded: 25,
        newStreak,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });

  } catch (err: any) {
    console.error("Philosophy update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}