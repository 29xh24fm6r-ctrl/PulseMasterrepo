/**
 * Notification Preferences API
 * GET /api/notifications/preferences - Get preferences
 * PATCH /api/notifications/preferences - Update preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from "@/lib/notifications/push";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const preferences = await getNotificationPreferences(userId);

    return NextResponse.json({ preferences });
  } catch (error: any) {
    console.error("[Preferences GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const success = await updateNotificationPreferences(userId, body);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to update preferences" },
        { status: 500 }
      );
    }

    const preferences = await getNotificationPreferences(userId);

    return NextResponse.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    console.error("[Preferences PATCH] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
