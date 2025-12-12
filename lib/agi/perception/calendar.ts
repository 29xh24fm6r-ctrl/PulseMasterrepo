// Calendar Perception v2
// lib/agi/perception/calendar.ts

import { supabaseAdmin } from "@/lib/supabase";

export interface CalendarEventFeatures {
  id: string;
  title: string;
  start: string;
  end: string;
  importanceScore: number; // 0-1
  emotionalLoad: "low" | "medium" | "high";
  energyRequirement: "low" | "medium" | "high";
  category: "deep_work" | "shallow_work" | "social" | "admin" | "travel" | "personal" | "meeting";
}

export interface DayFeatures {
  date: string;
  overloadScore: number; // 0-1, higher = more overloaded
  fragmentationScore: number; // 0-1, higher = more fragmented
  opportunityBlocks: Array<{
    start: string;
    end: string;
    durationMinutes: number;
    quality: "excellent" | "good" | "fair";
  }>;
  totalEvents: number;
  totalMinutes: number;
}

/**
 * Analyze calendar events and extract features
 */
export async function analyzeCalendarEvents(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarEventFeatures[]> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .maybeSingle();

  const dbUserId = userRow?.id || userId;

  try {
    const { data: events } = await supabaseAdmin
      .from("calendar_events")
      .select("*")
      .eq("user_id", dbUserId)
      .gte("start_time", startDate.toISOString())
      .lte("start_time", endDate.toISOString())
      .order("start_time", { ascending: true });

    if (!events || events.length === 0) return [];

    return events.map((event) => {
      const title = (event.title || event.summary || "").toLowerCase();
      const description = (event.description || "").toLowerCase();

      // Importance score (heuristic)
      let importanceScore = 0.5;
      if (title.includes("client") || title.includes("deal") || title.includes("important")) {
        importanceScore = 0.8;
      }
      if (title.includes("1:1") || title.includes("review") || title.includes("planning")) {
        importanceScore = 0.7;
      }
      if (title.includes("lunch") || title.includes("coffee") || title.includes("social")) {
        importanceScore = 0.3;
      }

      // Emotional load
      let emotionalLoad: "low" | "medium" | "high" = "low";
      if (
        title.includes("difficult") ||
        title.includes("conflict") ||
        title.includes("review") ||
        description.includes("stress")
      ) {
        emotionalLoad = "high";
      } else if (title.includes("meeting") || title.includes("call")) {
        emotionalLoad = "medium";
      }

      // Energy requirement
      let energyRequirement: "low" | "medium" | "high" = "medium";
      const duration = event.end_time
        ? (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60)
        : 60;
      if (duration > 90 || title.includes("deep") || title.includes("focus")) {
        energyRequirement = "high";
      } else if (duration < 30 || title.includes("quick") || title.includes("standup")) {
        energyRequirement = "low";
      }

      // Category
      let category: CalendarEventFeatures["category"] = "meeting";
      if (title.includes("focus") || title.includes("deep work") || title.includes("coding")) {
        category = "deep_work";
      } else if (title.includes("email") || title.includes("admin") || title.includes("review")) {
        category = "shallow_work";
      } else if (title.includes("lunch") || title.includes("dinner") || title.includes("social")) {
        category = "social";
      } else if (title.includes("travel") || title.includes("flight")) {
        category = "travel";
      } else if (title.includes("personal") || title.includes("family")) {
        category = "personal";
      }

      return {
        id: event.id,
        title: event.title || event.summary || "Untitled",
        start: event.start_time,
        end: event.end_time || new Date(new Date(event.start_time).getTime() + 60 * 60 * 1000).toISOString(),
        importanceScore,
        emotionalLoad,
        energyRequirement,
        category,
      };
    });
  } catch (err: any) {
    if (err.code !== "42P01") {
      console.warn("Calendar perception failed:", err.message);
    }
    return [];
  }
}

/**
 * Analyze day-level features
 */
export async function analyzeDayFeatures(
  userId: string,
  date: Date
): Promise<DayFeatures> {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const events = await analyzeCalendarEvents(userId, startOfDay, endOfDay);

  // Calculate overload score
  const totalMinutes = events.reduce((sum, e) => {
    const duration = (new Date(e.end).getTime() - new Date(e.start).getTime()) / (1000 * 60);
    return sum + duration;
  }, 0);

  const overloadScore = Math.min(1, totalMinutes / 480); // 8 hours = 1.0

  // Calculate fragmentation score
  const gaps: number[] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const gap = (new Date(events[i + 1].start).getTime() - new Date(events[i].end).getTime()) / (1000 * 60);
    if (gap > 0 && gap < 60) {
      gaps.push(gap);
    }
  }
  const fragmentationScore = Math.min(1, gaps.length / 5); // 5+ small gaps = fragmented

  // Find opportunity blocks (gaps >= 60 minutes)
  const opportunityBlocks: DayFeatures["opportunityBlocks"] = [];
  for (let i = 0; i < events.length - 1; i++) {
    const gapStart = new Date(events[i].end);
    const gapEnd = new Date(events[i + 1].start);
    const gapMinutes = (gapEnd.getTime() - gapStart.getTime()) / (1000 * 60);

    if (gapMinutes >= 60) {
      const quality =
        gapMinutes >= 180 ? "excellent" : gapMinutes >= 120 ? "good" : "fair";
      opportunityBlocks.push({
        start: gapStart.toISOString(),
        end: gapEnd.toISOString(),
        durationMinutes: gapMinutes,
        quality,
      });
    }
  }

  // Check for morning/evening blocks
  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];
  const dayStart = new Date(startOfDay);
  dayStart.setHours(6, 0, 0, 0);
  const dayEnd = new Date(endOfDay);
  dayEnd.setHours(22, 0, 0, 0);

  if (firstEvent) {
    const morningGap = (new Date(firstEvent.start).getTime() - dayStart.getTime()) / (1000 * 60);
    if (morningGap >= 60) {
      opportunityBlocks.push({
        start: dayStart.toISOString(),
        end: firstEvent.start,
        durationMinutes: morningGap,
        quality: morningGap >= 120 ? "excellent" : "good",
      });
    }
  }

  if (lastEvent) {
    const eveningGap = (dayEnd.getTime() - new Date(lastEvent.end).getTime()) / (1000 * 60);
    if (eveningGap >= 60) {
      opportunityBlocks.push({
        start: lastEvent.end,
        end: dayEnd.toISOString(),
        durationMinutes: eveningGap,
        quality: eveningGap >= 120 ? "good" : "fair",
      });
    }
  }

  return {
    date: date.toISOString().split("T")[0],
    overloadScore,
    fragmentationScore,
    opportunityBlocks: opportunityBlocks.sort((a, b) => b.durationMinutes - a.durationMinutes),
    totalEvents: events.length,
    totalMinutes,
  };
}



