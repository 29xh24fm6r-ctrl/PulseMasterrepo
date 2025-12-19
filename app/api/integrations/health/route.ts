import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface IntegrationHealth {
  provider: string;
  status: "connected" | "needs_reconnect" | "not_configured";
  lastSync: string | null;
  details?: any;
}

export async function GET() {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();

    const integrations: IntegrationHealth[] = [];

      // Check Gmail
      const gmailHealth = await checkGmail(supabaseUserId);
      integrations.push(gmailHealth);

      // Check Calendar (Google Calendar)
      const calendarHealth = await checkCalendar(supabaseUserId);
      integrations.push(calendarHealth);

      // Check Outlook
      const outlookHealth = await checkOutlook(supabaseUserId);
      integrations.push(outlookHealth);

    return NextResponse.json({ ok: true, integrations });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: err?.status || 500 }
    );
  }
}

async function checkGmail(userId: string): Promise<IntegrationHealth> {
  try {
    // Check for Gmail token/integration row
    const { data: tokenRow } = await supabaseAdmin
      .from("integration_tokens")
      .select("id, provider, last_sync_at, expires_at, meta")
      .eq("user_id", userId)
      .eq("provider", "gmail")
      .maybeSingle();

    if (!tokenRow) {
      return {
        provider: "gmail",
        status: "not_configured",
        lastSync: null,
      };
    }

    // Check if token is expired
    const isExpired = tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date();

    if (isExpired) {
      return {
        provider: "gmail",
        status: "needs_reconnect",
        lastSync: tokenRow.last_sync_at,
        details: { reason: "Token expired" },
      };
    }

    // Try a minimal API call to verify token works
    // This is a placeholder - actual implementation would call Gmail API
    // For now, if token exists and not expired, consider it connected
    const lastSync = tokenRow.last_sync_at;

    return {
      provider: "gmail",
      status: "connected",
      lastSync,
      details: { lastSyncAt: lastSync },
    };
  } catch (err: any) {
    return {
      provider: "gmail",
      status: "needs_reconnect",
      lastSync: null,
      details: { error: err.message },
    };
  }
}

async function checkCalendar(userId: string): Promise<IntegrationHealth> {
  try {
    const { data: tokenRow } = await supabaseAdmin
      .from("integration_tokens")
      .select("id, provider, last_sync_at, expires_at")
      .eq("user_id", userId)
      .eq("provider", "google_calendar")
      .maybeSingle();

    if (!tokenRow) {
      return {
        provider: "calendar",
        status: "not_configured",
        lastSync: null,
      };
    }

    const isExpired = tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date();

    if (isExpired) {
      return {
        provider: "calendar",
        status: "needs_reconnect",
        lastSync: tokenRow.last_sync_at,
      };
    }

    return {
      provider: "calendar",
      status: "connected",
      lastSync: tokenRow.last_sync_at,
    };
  } catch (err: any) {
    return {
      provider: "calendar",
      status: "needs_reconnect",
      lastSync: null,
    };
  }
}

async function checkOutlook(userId: string): Promise<IntegrationHealth> {
  try {
    const { data: tokenRow } = await supabaseAdmin
      .from("integration_tokens")
      .select("id, provider, last_sync_at, expires_at")
      .eq("user_id", userId)
      .eq("provider", "outlook")
      .maybeSingle();

    if (!tokenRow) {
      return {
        provider: "outlook",
        status: "not_configured",
        lastSync: null,
      };
    }

    const isExpired = tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date();

    if (isExpired) {
      return {
        provider: "outlook",
        status: "needs_reconnect",
        lastSync: tokenRow.last_sync_at,
      };
    }

    return {
      provider: "outlook",
      status: "connected",
      lastSync: tokenRow.last_sync_at,
    };
  } catch (err: any) {
    return {
      provider: "outlook",
      status: "needs_reconnect",
      lastSync: null,
    };
  }
}

