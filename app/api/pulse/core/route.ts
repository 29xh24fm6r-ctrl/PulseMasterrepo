// Pulse AI Core - The Unified Brain
// POST /api/pulse/core
// One endpoint to power the entire dashboard with AI intelligence

import { NextRequest, NextResponse } from "next/server";
import { getContacts, type Contact } from "@/lib/data/journal";
import { auth } from "@clerk/nextjs/server";
import { createClient } => "@supabase/supabase-js";
import OpenAI from "openai";
import { loadKernel, loadRelevantModules, detectRelevantModules } from "@/app/lib/brain-loader";
import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const openai = new OpenAI();

// Types for the unified response
interface PulseInsight {
  id: string;
  type: "proactive" | "emotional" | "productivity" | "relationship" | "celebration" | "warning";
  priority: "critical" | "high" | "medium" | "low";
  icon: string;
  title: string;
  message: string;
  action?: { label: string; type: string; payload?: any };
  source?: string;
}

interface EmotionalState {
  inferredMood: string;
  energyLevel: number;
  stressIndicators: string[];
  supportNeeded: boolean;
  suggestedIntervention?: string;
}

interface DailyQuest {
  id: string;
  type: "life" | "growth" | "courage" | "kindness";
  title: string;
  description: string;
  xpReward: number;
  difficulty: "easy" | "medium" | "hard";
  expiresAt: string;
}

interface PulseCoreResponse {
  success: boolean;
  timestamp: string;
  user: {
    name: string;
    archetype?: string;
    jobTitle?: string;
    xpTotal: number;
    currentStreak: number;
  };
  greeting: string;
  emotionalState: EmotionalState;
  insights: PulseInsight[];
  quests: DailyQuest[];
  nextBestAction: {
    task?: any;
    message: string;
    reasoning: string;
  };
  relationshipAlerts: Array<{
    contactName: string;
    daysSinceContact: number;
    suggestedAction: string;
  }>;
  calendarSummary: {
    eventsToday: number;
    nextEvent?: { title: string; startsIn: string };
    freeTimeBlocks: string[];
  };
  productivityScore: {
    score: number;
    trend: "up" | "down" | "stable";
    factors: string[];
  };
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { context = "dashboard", forceRefresh = false } = body;

    // Check tokens
    const usageCheck = await canMakeAICall(userId, "pulse_core", 10);
    if (!usageCheck.allowed) {
      return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });
    }

    console.log("🧠 Pulse Core: Gathering intelligence...");

    // ============================================
    // 1. LOAD ALL USER DATA FROM SUPABASE
    // ============================================
    const [
      userResult,
      profileResult,
      tasksResult,
      dealsResult,
      followUpsResult,
      habitsResult,
      journalResult,
      interactionsResult,
      contactsResult,
      streaksResult,
      xpResult,
    ] = await Promise.all([
      supabase.from("users").select("*").eq("clerk_id", userId).single(),
      supabase.from("user_profiles").select("*, job_title:job_titles(name)").eq("user_id", userId).single(),
      supabase.from("tasks").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
      supabase.from("deals").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
      supabase.from("follow_ups").select("*").eq("user_id", userId).eq("status", "pending").limit(20),
      supabase.from("habits").select("*, habit_completions(*)").eq("user_id", userId).limit(20),
      supabase.from("journal_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(7),
      supabase.from("interactions").select("*, contact:contacts(name, company)").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(20),
      supabase.from("contacts").select("*").eq("user_id", userId).order("last_contact", { ascending: true }).limit(50),
      supabase.from("streaks").select("*").eq("user_id", userId),
      supabase.from("xp_transactions").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
    ]);

    const user = userResult.data;
    const profile = profileResult.data;
    const tasks = tasksResult.data || [];
    const deals = dealsResult.data || [];
    const followUps = followUpsResult.data || [];
    const habits = habitsResult.data || [];
    const journalEntries = journalResult.data || [];
    const interactions = interactionsResult.data || [];
    const contacts = contactsResult.data || [];
    const streaks = streaksResult.data || [];
    const xpTransactions = xpResult.data || [];

    // Calculate totals
    const totalXP = xpTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
    const currentStreak = streaks.find(s => s.type === "daily")?.count || 0;

    console.log(`🧠 Pulse Core: Loaded ${tasks.length} tasks, ${deals.length} deals, ${contacts.length} contacts`);

    // ============================================
    // 2. LOAD BRAIN MODULES
    // ============================================
    const kernelBrain = await loadKernel();
    const relevantModules = await loadRelevantModules(context);

    // ============================================
    // 3. BUILD CONTEXT FOR AI
    // ============================================
    const now = new Date();
    const hour = now.getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const dayOfWeek = now.toLocaleDateString("en-US", { weekday: "long" });

    // Analyze tasks
    const overdueTasks = tasks.filter(t => t.due_date && new Date(t.due_date) < now && t.status !== "done");
    const todayTasks = tasks.filter(t => {
      if (!t.due_date) return false;
      const due = new Date(t.due_date);
      return due.toDateString() === now.toDateString() && t.status !== "done";
    });
    const completedToday = tasks.filter(t => {
      if (!t.completed_at) return false;
      const completed = new Date(t.completed_at);
      return completed.toDateString() === now.toDateString();
    });

    // Analyze deals
    const staleDeals = deals.filter(d => {
      if (!d.last_activity) return false;
      const daysSince = Math.floor((now.getTime() - new Date(d.last_activity).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 7 && d.stage !== "closed_won" && d.stage !== "closed_lost";
    });

    // Analyze relationships
    const coldContacts = contacts.filter((c: Contact) => {
      if (!c.last_contact) return true;
      const daysSince = Math.floor((now.getTime() - new Date(c.last_contact).getTime()) / (1000 * 60 * 60 * 24));
      return daysSince >= 14;
    }).slice(0, 5);

    // Analyze habits
    const habitsAtRisk = habits.filter(h => {
      const todayStr = now.toISOString().split("T")[0];
      const completions = h.habit_completions || [];
      const completedToday = completions.some((c: any) => c.completed_at?.startsWith(todayStr));
      return !completedToday && (h.streak || 0) >= 3;
    });

    // Recent journal sentiment
    const recentJournalMood = journalEntries.length > 0
      ? journalEntries[0].mood || journalEntries[0].extracted_data?.mood || "neutral"
      : "unknown";

    // ============================================
    // 4. AI ORCHESTRATION - THE BRAIN
    // ============================================
    const aiPrompt = `You are PULSE, the world's most powerful personal AI assistant. You have deep knowledge of this user and their life.

## YOUR BRAIN (Knowledge Modules)
${kernelBrain}

## USER PROFILE
- Name: ${user?.name || "User"}
- Archetype: ${profile?.archetype || "Unknown"}
- Job: ${profile?.job_title?.name || profile?.professional_identity?.specificRole || "Professional"}
- XP Total: ${totalXP}
- Current Streak: ${currentStreak} days

## CURRENT CONTEXT
- Time: ${timeOfDay} on ${dayOfWeek}
- Recent Journal Mood: ${recentJournalMood}
- Tasks Completed Today: ${completedToday.length}
- Overdue Tasks: ${overdueTasks.length}
- Tasks Due Today: ${todayTasks.length}
- Stale Deals: ${staleDeals.length}
- Contacts Needing Attention: ${coldContacts.length}
- Habits at Risk: ${habitsAtRisk.length}

## TODAY'S DATA
Overdue Tasks: ${JSON.stringify(overdueTasks.slice(0, 5).map(t => ({ title: t.title, priority: t.priority, daysOverdue: Math.floor((now.getTime() - new Date(t.due_date).getTime()) / (1000 * 60 * 60 * 24)) })))}

Today's Tasks: ${JSON.stringify(todayTasks.slice(0, 5).map(t => ({ title: t.title, priority: t.priority })))}

Stale Deals: ${JSON.stringify(staleDeals.slice(0, 3).map(d => ({ name: d.name, company: d.company, value: d.value, daysSince: Math.floor((now.getTime() - new Date(d.last_activity).getTime()) / (1000 * 60 * 60 * 24)) })))}

Cold Contacts: ${JSON.stringify(coldContacts.map(c => ({ name: c.name, company: c.company, daysSince: c.last_contact ? Math.floor((now.getTime() - new Date(c.last_contact).getTime()) / (1000 * 60 * 60 * 24)) : 999 })))}

Habits at Risk: ${JSON.stringify(habitsAtRisk.map(h => ({ name: h.name, streak: h.streak })))}

Pending Follow-ups: ${JSON.stringify(followUps.slice(0, 5).map(f => ({ person: f.person_name, company: f.company, dueDate: f.due_date })))}

## YOUR TASK
Generate a comprehensive intelligence response. Be warm, direct, and actionable. This user has ADD, so be concise and prioritize ruthlessly.

Respond with this exact JSON structure:
{
  "greeting": "Personalized greeting based on time, mood, and context",
  "emotionalState": {
    "inferredMood": "Based on journal and activity patterns",
    "energyLevel": 1-10,
    "stressIndicators": ["indicator1", "indicator2"],
    "supportNeeded": true/false,
    "suggestedIntervention": "If support needed, what would help"
  },
  "insights": [
    {
      "id": "unique_id",
      "type": "proactive|emotional|productivity|relationship|celebration|warning",
      "priority": "critical|high|medium|low",
      "icon": "emoji",
      "title": "Short title",
      "message": "Actionable message",
      "action": { "label": "Button text", "type": "action_type", "payload": {} }
    }
  ],
  "quests": [
    {
      "id": "quest_id",
      "type": "life|growth|courage|kindness",
      "title": "Quest title",
      "description": "What to do",
      "xpReward": 50-500,
      "difficulty": "easy|medium|hard"
    }
  ],
  "nextBestAction": {
    "taskId": "id if applicable",
    "taskTitle": "What to do",
    "message": "Why this matters right now",
    "reasoning": "Brief explanation"
  },
  "relationshipAlerts": [
    {
      "contactName": "Name",
      "daysSinceContact": 14,
      "suggestedAction": "What to do"
    }
  ],
  "productivityScore": {
    "score": 1-100,
    "trend": "up|down|stable",
    "factors": ["factor1", "factor2"]
  }
}

Generate 3-7 insights, 2-3 quests, and top 3 relationship alerts. Be specific and personal.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: aiPrompt }],
      max_tokens: 2500,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const aiResponse = JSON.parse(completion.choices[0]?.message?.content || "{}");

    // ============================================
    // 5. BUILD FINAL RESPONSE
    // ============================================
    const response: PulseCoreResponse = {
      success: true,
      timestamp: now.toISOString(),
      user: {
        name: user?.name || "User",
        archetype: profile?.archetype,
        jobTitle: profile?.job_title?.name,
        xpTotal: totalXP,
        currentStreak,
      },
      greeting: aiResponse.greeting || `Good ${timeOfDay}!`,
      emotionalState: aiResponse.emotionalState || {
        inferredMood: recentJournalMood,
        energyLevel: 5,
        stressIndicators: [],
        supportNeeded: false,
      },
      insights: aiResponse.insights || [],
      quests: (aiResponse.quests || []).map((q: any) => ({
        ...q,
        expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      })),
      nextBestAction: aiResponse.nextBestAction || {
        message: "Start with your most important task",
        reasoning: "Focus on what matters most",
      },
      relationshipAlerts: aiResponse.relationshipAlerts || [],
      calendarSummary: {
        eventsToday: 0, // Would integrate with calendar API
        freeTimeBlocks: [],
      },
      productivityScore: aiResponse.productivityScore || {
        score: 70,
        trend: "stable",
        factors: [],
      },
    };

    console.log(`🧠 Pulse Core: Generated ${response.insights.length} insights, ${response.quests.length} quests`);

    return NextResponse.json(response);

  } catch (err: any) {
    console.error("🧠 Pulse Core Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// GET for simple health check
export async function GET() {
  return NextResponse.json({
    status: "Pulse AI Core Online",
    version: "2.0",
    capabilities: [
      "Unified intelligence",
      "Proactive insights",
      "Emotional awareness",
      "Quest generation",
      "Relationship monitoring",
      "Productivity scoring",
    ]
  });
}