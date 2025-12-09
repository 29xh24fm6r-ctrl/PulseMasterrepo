/**
 * Push Subscription API
 * POST /api/notifications/subscribe - Subscribe to push
 * DELETE /api/notifications/subscribe - Unsubscribe
 * GET /api/notifications/subscribe - Get subscription status
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  saveSubscription,
  removeSubscription,
  getUserSubscriptions,
  getVapidPublicKey,
} from "@/lib/notifications/push";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const subscriptions = await getUserSubscriptions(userId);
    const vapidPublicKey = getVapidPublicKey();

    return NextResponse.json({
      subscribed: subscriptions.length > 0,
      subscriptionCount: subscriptions.length,
      vapidPublicKey,
    });
  } catch (error: any) {
    console.error("[Subscribe GET] Error:", error);
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
    const { subscription, deviceName } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return NextResponse.json(
        { error: "Invalid subscription object" },
        { status: 400 }
      );
    }

    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await saveSubscription(userId, subscription, {
      userAgent,
      deviceName,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      id: result.id,
    });
  } catch (error: any) {
    console.error("[Subscribe POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json(
        { error: "endpoint is required" },
        { status: 400 }
      );
    }

    const success = await removeSubscription(userId, endpoint);

    return NextResponse.json({ success });
  } catch (error: any) {
    console.error("[Subscribe DELETE] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
