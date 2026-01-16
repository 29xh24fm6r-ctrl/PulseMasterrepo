// POST /api/dashboard/telemetry
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

// const supabase = createClient(
//   process.env.NEXT_PUBLIC_SUPABASE_URL!,
//   process.env.SUPABASE_SERVICE_ROLE_KEY!
// );

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { widgetKey, eventType, metadata } = await req.json();

    if (!widgetKey || !eventType) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await supabase.from("dashboard_telemetry_events").insert({
      user_id_uuid: userId,
      widget_key: widgetKey,
      event_type: eventType,
      metadata: metadata || {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    // Silent fail for telemetry
    return NextResponse.json({ success: true });
  }
}
