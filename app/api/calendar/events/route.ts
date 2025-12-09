import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCachedEvents,
  getTodaysEvents,
  hasCalendarConnected,
  syncCalendarEvents,
  getCalendarAccount,
  disconnectCalendar,
} from "@/lib/calendar/googleClient";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const mode = searchParams.get("mode");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (mode === "status") {
      const connected = await hasCalendarConnected(userId);
      const account = connected ? await getCalendarAccount(userId) : null;
      return NextResponse.json({
        connected,
        lastSynced: account?.lastSyncedAt?.toISOString() || null,
        provider: connected ? "google" : null,
      });
    }

    const connected = await hasCalendarConnected(userId);
    if (!connected) {
      return NextResponse.json({ events: [], connected: false, message: "Calendar not connected" });
    }

    if (mode === "today") {
      const events = await getTodaysEvents(userId);
      return NextResponse.json({ events, connected: true });
    }

    const start = startDate ? new Date(startDate) : new Date();
    const end = endDate ? new Date(endDate) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const events = await getCachedEvents(userId, { startDate: start, endDate: end });

    return NextResponse.json({ events, connected: true });
  } catch (error: any) {
    console.error("[Calendar Events GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, startDate, endDate } = body;

    if (action === "sync") {
      const start = startDate ? new Date(startDate) : new Date();
      const end = endDate ? new Date(endDate) : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
      const result = await syncCalendarEvents(userId, { timeMin: start, timeMax: end });
      return NextResponse.json({ success: true, ...result });
    }

    if (action === "disconnect") {
      const success = await disconnectCalendar(userId);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Calendar Events POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
