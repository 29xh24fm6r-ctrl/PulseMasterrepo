import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Replace with actual Butler engine analysis
    // This will:
    // 1. Query overdue tasks
    // 2. Query stale deals (no activity in 10+ days)
    // 3. Query cold relationships (no contact in 14+ days)
    // 4. Query upcoming deadlines
    // 5. Query streak risks
    // 6. Use AI to generate prioritized, actionable recommendations

    const placeholderData = {
      recommendations: [
        {
          id: "1",
          text: "Follow up with John Doe - last contact was 5 days ago",
          priority: "high",
          category: "relationship",
          actionUrl: "/relationships/john-doe"
        },
        {
          id: "2",
          text: "Prepare weekly review - due tomorrow",
          priority: "medium",
          category: "planning",
          actionUrl: "/weekly-review"
        },
        {
          id: "3",
          text: "Check today's priorities - 3 high-priority tasks due",
          priority: "high",
          category: "task",
          actionUrl: "/tasks"
        },
        {
          id: "4",
          text: "Deal 'Acme Corp' has been inactive for 12 days - consider follow-up",
          priority: "medium",
          category: "deal",
          actionUrl: "/deals/acme-corp"
        },
        {
          id: "5",
          text: "Meditation streak at 6 days - complete today to reach 7-day milestone",
          priority: "low",
          category: "habit",
          actionUrl: "/habits"
        }
      ],
      generatedAt: new Date().toISOString()
    };

    return NextResponse.json(placeholderData);
  } catch (error) {
    console.error("[Butler Recommendations API]", error);
    return NextResponse.json(
      { error: "Failed to fetch Butler recommendations" },
      { status: 500 }
    );
  }
}





