// Daily Rhythm API
// app/api/rhythm/daily/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  generateMorningBriefing,
  generateMiddayCheckin,
  generateEveningDebrief,
  getDailyRhythmEntries,
  upsertDailyRhythmEntry,
} from "@/lib/rhythm/engine";
import {
  renderMorningBriefingText,
  renderMiddayCheckinText,
  renderEveningDebriefText,
} from "@/lib/rhythm/llm";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const dateParam = url.searchParams.get("date");
    const autogenerate = url.searchParams.get("autogenerate") === "true";
    const type = url.searchParams.get("type") as
      | "morning_briefing"
      | "midday_checkin"
      | "evening_debrief"
      | null;

    const date = dateParam ? new Date(dateParam) : new Date();

    // Get existing entries
    const entries = await getDailyRhythmEntries(userId, date);

    // Filter by type if specified
    let filteredEntries = entries;
    if (type) {
      filteredEntries = entries.filter((e) => e.type === type);
    }

    // Auto-generate missing entries if requested
    if (autogenerate && filteredEntries.length === 0) {
      if (!type || type === "morning_briefing") {
        const data = await generateMorningBriefing(userId, date);
        const summary = await renderMorningBriefingText(data);
        await upsertDailyRhythmEntry(userId, date, "morning_briefing", summary, data);
        filteredEntries.push({
          id: "",
          user_id: userId,
          date: date.toISOString().split("T")[0],
          type: "morning_briefing",
          summary,
          data,
        });
      }

      if (!type || type === "midday_checkin") {
        const now = new Date();
        if (now.getHours() >= 12) {
          const data = await generateMiddayCheckin(userId, date);
          const summary = await renderMiddayCheckinText(data);
          await upsertDailyRhythmEntry(userId, date, "midday_checkin", summary, data);
          filteredEntries.push({
            id: "",
            user_id: userId,
            date: date.toISOString().split("T")[0],
            type: "midday_checkin",
            summary,
            data,
          });
        }
      }

      if (!type || type === "evening_debrief") {
        const now = new Date();
        if (now.getHours() >= 18) {
          const data = await generateEveningDebrief(userId, date);
          const summary = await renderEveningDebriefText(data);
          await upsertDailyRhythmEntry(userId, date, "evening_debrief", summary, data);
          filteredEntries.push({
            id: "",
            user_id: userId,
            date: date.toISOString().split("T")[0],
            type: "evening_debrief",
            summary,
            data,
          });
        }
      }
    }

    return NextResponse.json({
      entries: filteredEntries.map((e) => ({
        type: e.type,
        summary: e.summary,
        data: e.data,
      })),
    });
  } catch (err: any) {
    console.error("[DailyRhythm] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get daily rhythm" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, date: dateParam } = body;

    if (!type || !["morning_briefing", "midday_checkin", "evening_debrief"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type" },
        { status: 400 }
      );
    }

    const date = dateParam ? new Date(dateParam) : new Date();

    let data: any;
    let summary: string;

    if (type === "morning_briefing") {
      data = await generateMorningBriefing(userId, date);
      summary = await renderMorningBriefingText(data);
    } else if (type === "midday_checkin") {
      data = await generateMiddayCheckin(userId, date);
      summary = await renderMiddayCheckinText(data);
    } else {
      data = await generateEveningDebrief(userId, date);
      summary = await renderEveningDebriefText(data);
    }

    await upsertDailyRhythmEntry(userId, date, type, summary, data);

    return NextResponse.json({
      success: true,
      entry: {
        type,
        summary,
        data,
      },
    });
  } catch (err: any) {
    console.error("[DailyRhythm] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to generate daily rhythm entry" },
      { status: 500 }
    );
  }
}

