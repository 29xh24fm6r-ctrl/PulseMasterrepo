import { NextRequest, NextResponse } from "next/server";

// ============================================
// CORTEX THOUGHTS API (MOCK)
// ============================================
// In the future, this will query the 'cortex_thoughts' table or the Vector DB.
// For now, it deterministically generates thoughts based on the user's current URL.

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const path = searchParams.get("path") || "/";

    const thoughts = [];

    // 1. CONTEXT: CONTACTS
    if (path.includes("/contacts")) {
        thoughts.push({
            text: "Drafted reply to Sarah's update (Review)",
            type: "action",
            context: "Intelligence",
        });
        thoughts.push({
            text: "Last met 2 weeks ago. Schedule catch-up?",
            type: "suggestion",
            context: "Relationship",
        });
    }

    // 2. CONTEXT: TASKS / PRODUCTIVITY
    if (path.includes("/tasks") || path.includes("/productivity")) {
        thoughts.push({
            text: "Deep Work Block: 2pm - 4pm (Scheduled)",
            type: "info",
            context: "Calendar",
        });
        thoughts.push({
            text: "3 High Priority tasks due today",
            type: "alert",
            context: "Ops",
        });
    }

    // 3. CONTEXT: JOURNAL
    if (path.includes("/journal")) {
        thoughts.push({
            text: "Energy trend is low. Suggesting early shutdown.",
            type: "suggestion",
            context: "Bio",
        });
    }

    // 4. GENERAL / ORBIT (Default)
    if (thoughts.length === 0) {
        thoughts.push({
            text: "System is nominal. 34 Active Signals.",
            type: "info",
            context: "System",
        });
        thoughts.push({
            text: "Review Morning Briefing?",
            type: "action",
            context: "Orbit",
        });
    }

    return NextResponse.json({ thoughts });
}
