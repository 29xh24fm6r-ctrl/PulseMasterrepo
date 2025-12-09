import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// GET /api/voice/alerts - Get pending voice alerts
export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts: any[] = [];
    const now = new Date();

    // Check for upcoming calendar events (next 15 minutes)
    const soon = new Date(now.getTime() + 15 * 60 * 1000);
    const { data: upcomingEvents } = await supabase
      .from("calendar_events")
      .select("id, title, start_time, location")
      .eq("user_id", userId)
      .gte("start_time", now.toISOString())
      .lte("start_time", soon.toISOString())
      .limit(3);

    if (upcomingEvents) {
      for (const event of upcomingEvents) {
        const startTime = new Date(event.start_time);
        const minutesUntil = Math.round((startTime.getTime() - now.getTime()) / 60000);
        alerts.push({
          id: `event-${event.id}`,
          type: "reminder",
          title: "Upcoming Event",
          message: `${event.title} starts in ${minutesUntil} minutes${event.location ? ` at ${event.location}` : ""}`,
          timestamp: now.toISOString(),
        });
      }
    }

    // Check for overdue tasks
    const { data: overdueTasks } = await supabase
      .from("tasks")
      .select("id, title, due_date")
      .eq("user_id", userId)
      .in("status", ["pending", "in_progress"])
      .lt("due_date", now.toISOString())
      .limit(3);

    if (overdueTasks) {
      for (const task of overdueTasks) {
        alerts.push({
          id: `task-${task.id}`,
          type: "urgent",
          title: "Overdue Task",
          message: `"${task.title}" is overdue`,
          timestamp: now.toISOString(),
        });
      }
    }

    // Check for pending autonomy suggestions
    const { data: suggestions } = await supabase
      .from("autonomy_actions")
      .select("id, action, priority")
      .eq("user_id", userId)
      .eq("status", "pending")
      .eq("priority", "high")
      .limit(2);

    if (suggestions) {
      for (const sug of suggestions) {
        alerts.push({
          id: `autonomy-${sug.id}`,
          type: "suggestion",
          title: "Pulse Suggestion",
          message: sug.action,
          timestamp: now.toISOString(),
        });
      }
    }

    // Check for recent insights
    const recentTime = new Date(now.getTime() - 30 * 60 * 1000); // Last 30 mins
    const { data: insights } = await supabase
      .from("third_brain_insights")
      .select("id, content, insight_type")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("created_at", recentTime.toISOString())
      .limit(2);

    if (insights) {
      for (const insight of insights) {
        alerts.push({
          id: `insight-${insight.id}`,
          type: "insight",
          title: "New Insight",
          message: insight.content,
          timestamp: now.toISOString(),
        });
      }
    }

    return NextResponse.json({ alerts });
  } catch (error: any) {
    console.error("[Voice Alerts] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/voice/alerts - Create a manual voice alert
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, message, type = "reminder" } = await req.json();

    // Store the alert (could be used for history or custom alerts)
    await supabase.from("third_brain_events").insert({
      user_id: userId,
      type: "voice_alert",
      source: "manual",
      title,
      summary: message,
      raw_payload: { alert_type: type },
      occurred_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      alert: {
        id: `manual-${Date.now()}`,
        type,
        title,
        message,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("[Voice Alerts] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}