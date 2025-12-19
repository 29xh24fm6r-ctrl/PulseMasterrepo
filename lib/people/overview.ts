import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { emptyOverview } from "@/lib/shared/overview";

export async function getPeopleOverview(clerkUserId: string) {
  try {
    // 1) Resolve db user id (UUID)
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .maybeSingle();

    const dbUserId = userRow?.id ?? null;

    // 2) Pull people from crm_contacts (canonical CRM table)
    // PRIMARY: Query by user_id (UUID) + status='active' - this is the canonical path
    let contacts: any[] = [];
    let queryInfo = "none";

    if (!dbUserId) {
      queryInfo = "no dbUserId resolved (users table lookup failed)";
    } else {
      // PRIMARY PATH: Query canonical active contacts by user_id (UUID)
      const { data, error: queryError } = await supabaseAdmin
        .from("crm_contacts")
        .select(
          "id, full_name, primary_email, company_name, tags, type, status, merged_into_contact_id, updated_at, created_at, owner_user_id, user_id"
        )
        .eq("user_id", dbUserId)
        .eq("status", "active") // Only canonical active contacts
        .order("created_at", { ascending: false })
        .limit(500);

      if (queryError) {
        console.error("[PeopleOverview] Query error:", queryError);
        queryInfo = `query error: ${queryError.message}`;
      } else {
        contacts = data || [];
        if (contacts.length > 0) {
          queryInfo = `crm_contacts (user_id=${dbUserId.substring(0, 8)}..., status='active') - ${contacts.length} found`;
        } else {
          // If no results with status='active', check if there are any contacts at all for this user
          const { data: anyStatus } = await supabaseAdmin
            .from("crm_contacts")
            .select("id, status")
            .eq("user_id", dbUserId)
            .limit(10);

          const totalForUser = (anyStatus || []).length;
          const activeCount = (anyStatus || []).filter((c: any) => c.status === "active").length;
          const mergedCount = (anyStatus || []).filter((c: any) => c.status === "merged").length;

          queryInfo = `crm_contacts (user_id=${dbUserId.substring(0, 8)}..., status='active') - 0 found (total: ${totalForUser}, active: ${activeCount}, merged: ${mergedCount})`;
        }
      }
    }

    // 3) Deals count per contact (fast + real)
    // This assumes crm_deals.primary_contact_id points to crm_contacts.id (your API already uses this)
    const contactIds = contacts.map((c) => c.id).filter(Boolean);

    let dealsByContact: Record<string, number> = {};

    if (dbUserId && contactIds.length) {
      const { data: dealRows } = await supabaseAdmin
        .from("crm_deals")
        .select("id, primary_contact_id")
        .eq("user_id", dbUserId)
        .in("primary_contact_id", contactIds);

      dealsByContact = (dealRows || []).reduce((acc: any, d: any) => {
        const key = d.primary_contact_id;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    }

    // Also try owner_user_id fallback for deals
    if (Object.keys(dealsByContact).length === 0 && contactIds.length) {
      const { data: dealRows } = await supabaseAdmin
        .from("crm_deals")
        .select("id, primary_contact_id")
        .eq("owner_user_id", clerkUserId)
        .in("primary_contact_id", contactIds);

      dealsByContact = (dealRows || []).reduce((acc: any, d: any) => {
        const key = d.primary_contact_id;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    }

    // Tasks count per contact (open tasks only)
    let tasksByContact: Record<string, number> = {};

    if (contactIds.length) {
      const { data: taskRows } = await supabaseAdmin
        .from("crm_tasks")
        .select("id, contact_id")
        .eq("owner_user_id", clerkUserId)
        .in("contact_id", contactIds)
        .in("status", ["pending", "in_progress", "open"]);

      tasksByContact = (taskRows || []).reduce((acc: any, t: any) => {
        const key = t.contact_id;
        if (!key) return acc;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
    }

    // 4) Build overview payload (shape your PeopleOverview UI expects)
    const items = contacts.map((c) => ({
      id: c.id, // ✅ THIS IS NOW crm_contacts.id → CRM button works
      full_name: c.full_name,
      primary_email: c.primary_email,
      tags: c.tags || [],
      type: c.type || null,
      company_name: c.company_name || null,
      openDealsCount: dealsByContact[c.id] || 0,
      openTasksCount: tasksByContact[c.id] || 0,
      lastInteraction: null,
      // OPTIONAL: explicit href for UI if you want
      crmHref: `/crm/people/${c.id}`,
    }));

    // Get summary counts
    const totalDealsCount = Object.values(dealsByContact).reduce((sum: number, count: number) => sum + count, 0);

    // Total open tasks (across CRM) — scoped by Clerk ID (crm_tasks.owner_user_id)
    let openTasksCount = 0;
    {
      const { count } = await supabaseAdmin
        .from("crm_tasks")
        .select("*", { count: "exact", head: true })
        .eq("owner_user_id", clerkUserId)
        .in("status", ["pending", "in_progress", "open"]);

      openTasksCount = count || 0;
    }

    let recentNotesCount = 0;
    if (dbUserId) {
      const { count } = await supabaseAdmin
        .from("crm_interactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", dbUserId)
        .eq("type", "note");
      recentNotesCount = count || 0;
    }

    // Cards can be whatever you already had; keep simple for now
    const cards = [
      {
        title: "Total Contacts",
        value: items.length,
        subtitle: "In your CRM",
        state: items.length > 0 ? "good" : "empty",
        cta: { label: "Add Person", href: "#", action: "add-person" },
      },
      {
        title: "Open Deals",
        value: totalDealsCount,
        subtitle: "Across contacts",
        state: totalDealsCount > 0 ? "good" : "empty",
        cta: { label: "Add Deal", href: "#", action: "add-deal" },
      },
      {
        title: "Tasks",
        value: openTasksCount,
        subtitle: "Open CRM tasks",
        state: openTasksCount > 0 ? "warn" : "empty",
        cta: { label: "Add Task", href: "#", action: "add-task" },
      },
      {
        title: "Notes",
        value: recentNotesCount,
        subtitle: "Showing in CRM detail",
        state: recentNotesCount > 0 ? "good" : "empty",
      },
    ];

    return {
      ok: true,
      module: "people",
      summary: "Human Graph — CRM Contacts",
      cards,
      items,
      meta: {
        clerkUserId,
        userIdUsed: dbUserId || null,
        queryInfo,
        queriedFrom: "crm_contacts",
        counts: {
          contacts: items.length,
          totalInResult: contacts.length,
        },
      },
    };
  } catch (err) {
    console.error("[PeopleOverview] Error:", err);
    return emptyOverview("people", "People data unavailable");
  }
}

