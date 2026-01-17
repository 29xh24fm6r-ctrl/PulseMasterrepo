import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminRuntimeClient, getSupabaseRuntimeClient } from "@/lib/runtime/supabase.runtime";
import crypto from "crypto";

function getSupabase() {
  return getSupabaseAdminRuntimeClient();
}

// POST - Register new plugin/app
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, description, webhook_url, requested_events } = await req.json();

  if (!name) {
    return NextResponse.json({ error: "App name required" }, { status: 400 });
  }

  const supabase = getSupabase();

  // Generate app ID and secret
  const app_id = `app_${crypto.randomBytes(12).toString("hex")}`;
  const app_secret = `secret_${crypto.randomBytes(24).toString("hex")}`;
  const app_secret_hash = crypto.createHash("sha256").update(app_secret).digest("hex");

  const { data, error } = await supabase
    .from("dev_apps")
    .insert({
      user_id: userId,
      app_id,
      app_secret_hash,
      name,
      description,
      webhook_url,
      requested_events: requested_events || [],
      status: "active",
    })
    .select("id, app_id, name, description, status, created_at")
    .single();

  if (error) {
    console.error("App registration failed:", error);
    return NextResponse.json({ error: "Failed to register app" }, { status: 500 });
  }

  // Return secret ONCE - never stored in plaintext
  return NextResponse.json({
    app: data,
    app_secret, // Only returned once!
    warning: "Store this secret securely. It will not be shown again."
  });
}

// GET - List user's apps
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("dev_apps")
    .select("id, app_id, name, description, webhook_url, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("List apps failed:", error);
    return NextResponse.json({ error: "Failed to list apps" }, { status: 500 });
  }

  return NextResponse.json({ apps: data });
}