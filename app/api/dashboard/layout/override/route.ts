// POST /api/dashboard/layout/override
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { widgetKey, action } = await req.json();

    if (!widgetKey || !["HIDE", "PIN", "UNPIN", "UNHIDE"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Get current preference
    const { data: existing } = await supabase
      .from("user_widget_preferences")
      .select("*")
      .eq("user_id", userId)
      .eq("widget_key", widgetKey)
      .single();

    let isPinned = existing?.is_pinned ?? false;
    let isHidden = existing?.is_hidden ?? false;

    if (action === "HIDE") { isHidden = true; isPinned = false; }
    else if (action === "UNHIDE") { isHidden = false; }
    else if (action === "PIN") { isPinned = true; isHidden = false; }
    else if (action === "UNPIN") { isPinned = false; }

    await supabase.from("user_widget_preferences").upsert({
      user_id: userId,
      widget_key: widgetKey,
      is_pinned: isPinned,
      is_hidden: isHidden,
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,widget_key" });

    // Log telemetry
    await supabase.from("dashboard_telemetry_events").insert({
      user_id: userId,
      widget_key: widgetKey,
      event_type: action === "HIDE" ? "HIDE" : "CLICK",
      metadata: { action },
    });

    return NextResponse.json({ success: true, isPinned, isHidden });
  } catch (error) {
    console.error("[Layout Override]", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
