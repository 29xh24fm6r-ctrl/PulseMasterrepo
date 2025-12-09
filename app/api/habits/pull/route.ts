import { NextResponse } from "next/server";
import { 
  notion, 
  NotionDatabases, 
  readTitle, 
  readNumber,
  extractPageMeta 
} from "@/app/lib/notion";

export async function GET() {
  try {
    // Check if database is configured
    if (!NotionDatabases.habits) {
      return NextResponse.json({
        ok: true,
        habits: [],
        message: "Habits database not configured",
      });
    }

    const response = await notion.databases.query({
      database_id: NotionDatabases.habits,
    });

    const habits = (response.results || []).map((page: any) => {
      const props = page.properties || {};
      const meta = extractPageMeta(page);

      return {
        id: meta.id,
        name: readTitle(props, "Name", "Habit", "Title"),
        xp: readNumber(props, "XP"),
      };
    });

    return NextResponse.json({
      ok: true,
      habits,
    });
  } catch (err: any) {
    console.error("Habits pull error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to pull habits",
      },
      { status: 500 }
    );
  }
}
