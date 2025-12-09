import { NextResponse } from "next/server";
import { 
  notion, 
  NotionDatabases, 
  readNumber 
} from "@/app/lib/notion";

export async function GET() {
  try {
    // Check if XP database is configured
    if (!NotionDatabases.xp) {
      return NextResponse.json({
        ok: true,
        xpToday: 0,
        xpTotal: 0,
        message: "XP database not configured",
      });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayRes, allRes] = await Promise.all([
      notion.databases.query({
        database_id: NotionDatabases.xp,
        filter: {
          timestamp: "created_time",
          created_time: {
            on_or_after: todayStart.toISOString(),
          },
        },
      }),
      notion.databases.query({
        database_id: NotionDatabases.xp,
      }),
    ]);

    const xpToday = (todayRes.results || []).reduce((sum: number, page: any) => {
      const xp = readNumber(page.properties || {}, "XP") ?? 0;
      return sum + xp;
    }, 0);

    const xpTotal = (allRes.results || []).reduce((sum: number, page: any) => {
      const xp = readNumber(page.properties || {}, "XP") ?? 0;
      return sum + xp;
    }, 0);

    return NextResponse.json({
      ok: true,
      xpToday,
      xpTotal,
    });
  } catch (err: any) {
    console.error("XP summary error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to get XP summary",
      },
      { status: 500 }
    );
  }
}
