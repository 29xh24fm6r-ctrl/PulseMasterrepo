import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emptyOverview } from "@/lib/shared/overview";

export async function getTimeOverview(clerkUserId: string) {
  try {
    // Resolve Clerk ID to database UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    const dbUserId = userRow?.id || clerkUserId;

    const today = new Date();
    const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
    const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

    // Get calendar events for today
    const { data: events } = await supabaseAdmin
      .from("calendar_events")
      .select("id, title, start_time, end_time")
      .eq("user_id", dbUserId)
      .gte("start_time", todayStart)
      .lte("start_time", todayEnd)
      .order("start_time", { ascending: true });

    // Get next upcoming event
    const { data: nextEvent } = await supabaseAdmin
      .from("calendar_events")
      .select("id, title, start_time")
      .eq("user_id", dbUserId)
      .gt("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(1)
      .maybeSingle();

    // Calculate open time blocks (simplified - would need more logic for actual availability)
    const eventsToday = events?.length || 0;
    const nextUpTitle = nextEvent?.title || "No upcoming events";

    return {
      ok: true,
      module: "time",
      summary: `${eventsToday} events today | Next: ${nextUpTitle}`,
      cards: [
        {
          title: "Events Today",
          value: eventsToday,
          subtitle: "Scheduled events",
          state: eventsToday > 0 ? "warn" : "good",
        },
        {
          title: "Next Up",
          value: nextUpTitle,
          subtitle: nextEvent?.start_time ? new Date(nextEvent.start_time).toLocaleTimeString() : "No upcoming events",
          state: nextEvent ? "warn" : "good",
        },
        {
          title: "Open Time",
          subtitle: "Available time blocks",
          state: "empty",
          cta: { label: "View Calendar", href: "/time" },
        },
      ],
      items: events || [],
      meta: { eventsToday, nextEvent: nextEvent?.id || null },
    };
  } catch (err) {
    console.error("[TimeOverview] Error:", err);
    return emptyOverview("time", "Time data unavailable");
  }
}

