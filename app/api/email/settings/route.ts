// Email Settings API
// app/api/email/settings/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getUserEmailSettings, setUserTaskMode } from "@/lib/email/settings";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await getUserEmailSettings(userId);

    return NextResponse.json(settings);
  } catch (err: any) {
    console.error("[EmailSettings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to get email settings" },
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
    const { task_mode } = body;

    if (!task_mode || !["manual", "assistive", "auto"].includes(task_mode)) {
      return NextResponse.json(
        { error: "task_mode must be 'manual', 'assistive', or 'auto'" },
        { status: 400 }
      );
    }

    await setUserTaskMode(userId, task_mode);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[EmailSettings] Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to update email settings" },
      { status: 500 }
    );
  }
}

