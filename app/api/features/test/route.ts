import { NextResponse } from "next/server";
import { resolveSupabaseUser } from "@/lib/auth/resolveSupabaseUser";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Lightweight feature test endpoint
 * Tests basic CRUD operations for a feature
 */
export async function POST(req: Request) {
  try {
    const { supabaseUserId } = await resolveSupabaseUser();
    const body = await req.json();
    const feature = body.feature as string;

    if (!feature) {
      return NextResponse.json({ ok: false, error: "Feature name required" }, { status: 400 });
    }

    const result = await testFeature(feature, supabaseUserId);

    return NextResponse.json({ ok: result.ok, feature, result });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err?.message || String(err) },
      { status: err?.status || 500 }
    );
  }
}

async function testFeature(
  feature: string,
  userId: string
): Promise<{ ok: boolean; error?: string; details?: any }> {
  switch (feature) {
    case "contacts":
      return testContacts(userId);
    case "tasks":
      return testTasks(userId);
    case "deals":
      return testDeals(userId);
    case "journal":
      return testJournal(userId);
    case "habits":
      return testHabits(userId);
    case "intelligence":
      return testIntelligence(userId);
    case "voice":
      return testVoice(userId);
    case "notifications":
      return testNotifications(userId);
    default:
      return { ok: false, error: `Unknown feature: ${feature}` };
  }
}

async function testContacts(userId: string) {
  try {
    // Test READ
    const { data: contacts, error: readErr } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, updated_at")
      .eq("user_id", userId)
      .limit(1);

    if (readErr) {
      return { ok: false, error: `Read failed: ${readErr.message}` };
    }

    // Test CREATE (cleanup after)
    const testContact = {
      user_id: userId,
      first_name: "Test",
      last_name: "Contact",
      full_name: "Test Contact",
      display_name: "Test Contact",
    };

    const { data: created, error: createErr } = await supabaseAdmin
      .from("crm_contacts")
      .insert(testContact)
      .select("id")
      .single();

    if (createErr) {
      return { ok: false, error: `Create failed: ${createErr.message}` };
    }

    // Cleanup
    await supabaseAdmin.from("crm_contacts").delete().eq("id", created.id);

    return {
      ok: true,
      details: {
        canRead: true,
        canCreate: true,
        lastUpdated: contacts?.[0]?.updated_at || null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function testTasks(userId: string) {
  try {
    const { data: tasks, error: readErr } = await supabaseAdmin
      .from("tasks")
      .select("id, updated_at")
      .eq("user_id", userId)
      .limit(1);

    if (readErr) {
      return { ok: false, error: `Read failed: ${readErr.message}` };
    }

    const testTask = {
      user_id: userId,
      title: "Test Task",
      status: "pending",
    };

    const { data: created, error: createErr } = await supabaseAdmin
      .from("tasks")
      .insert(testTask)
      .select("id")
      .single();

    if (createErr) {
      return { ok: false, error: `Create failed: ${createErr.message}` };
    }

    await supabaseAdmin.from("tasks").delete().eq("id", created.id);

    return {
      ok: true,
      details: {
        canRead: true,
        canCreate: true,
        lastUpdated: tasks?.[0]?.updated_at || null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function testDeals(userId: string) {
  try {
    const { data: deals, error: readErr } = await supabaseAdmin
      .from("crm_deals")
      .select("id, updated_at")
      .eq("user_id", userId)
      .limit(1);

    if (readErr) {
      return { ok: false, error: `Read failed: ${readErr.message}` };
    }

    const testDeal = {
      user_id: userId,
      name: "Test Deal",
      status: "prospecting",
    };

    const { data: created, error: createErr } = await supabaseAdmin
      .from("crm_deals")
      .insert(testDeal)
      .select("id")
      .single();

    if (createErr) {
      return { ok: false, error: `Create failed: ${createErr.message}` };
    }

    await supabaseAdmin.from("crm_deals").delete().eq("id", created.id);

    return {
      ok: true,
      details: {
        canRead: true,
        canCreate: true,
        lastUpdated: deals?.[0]?.updated_at || null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function testJournal(userId: string) {
  try {
    const { data: entries, error: readErr } = await supabaseAdmin
      .from("journal_entries")
      .select("id, updated_at")
      .eq("user_id", userId)
      .limit(1);

    if (readErr) {
      return { ok: false, error: `Read failed: ${readErr.message}` };
    }

    const testEntry = {
      user_id: userId,
      entry_date: new Date().toISOString().split("T")[0],
      content: "Test entry",
    };

    const { data: created, error: createErr } = await supabaseAdmin
      .from("journal_entries")
      .insert(testEntry)
      .select("id")
      .single();

    if (createErr) {
      return { ok: false, error: `Create failed: ${createErr.message}` };
    }

    await supabaseAdmin.from("journal_entries").delete().eq("id", created.id);

    return {
      ok: true,
      details: {
        canRead: true,
        canCreate: true,
        lastUpdated: entries?.[0]?.updated_at || null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function testHabits(userId: string) {
  try {
    const { data: habits, error: readErr } = await supabaseAdmin
      .from("habits")
      .select("id, updated_at")
      .eq("user_id", userId)
      .limit(1);

    if (readErr) {
      return { ok: false, error: `Read failed: ${readErr.message}` };
    }

    const testHabit = {
      user_id: userId,
      name: "Test Habit",
      frequency: "daily",
    };

    const { data: created, error: createErr } = await supabaseAdmin
      .from("habits")
      .insert(testHabit)
      .select("id")
      .single();

    if (createErr) {
      return { ok: false, error: `Create failed: ${createErr.message}` };
    }

    await supabaseAdmin.from("habits").delete().eq("id", created.id);

    return {
      ok: true,
      details: {
        canRead: true,
        canCreate: true,
        lastUpdated: habits?.[0]?.updated_at || null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function testIntelligence(userId: string) {
  try {
    // Test if intelligence tables exist and are accessible
    const { data: sources, error: readErr } = await supabaseAdmin
      .from("intel_sources")
      .select("id, updated_at")
      .eq("user_id", userId)
      .limit(1);

    if (readErr) {
      return { ok: false, error: `Read failed: ${readErr.message}` };
    }

    return {
      ok: true,
      details: {
        canRead: true,
        lastUpdated: sources?.[0]?.updated_at || null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function testVoice(userId: string) {
  try {
    const { data: sessions, error: readErr } = await supabaseAdmin
      .from("voice_sessions")
      .select("id, created_at")
      .eq("user_id", userId)
      .limit(1);

    if (readErr) {
      return { ok: false, error: `Read failed: ${readErr.message}` };
    }

    return {
      ok: true,
      details: {
        canRead: true,
        lastSession: sessions?.[0]?.created_at || null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function testNotifications(userId: string) {
  try {
    const { data: notifs, error: readErr } = await supabaseAdmin
      .from("notifications")
      .select("id, created_at")
      .eq("user_id", userId)
      .limit(1);

    if (readErr) {
      return { ok: false, error: `Read failed: ${readErr.message}` };
    }

    return {
      ok: true,
      details: {
        canRead: true,
        lastNotification: notifs?.[0]?.created_at || null,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

