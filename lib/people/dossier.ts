import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface PersonDossier {
  ok: boolean;
  person: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
    company?: string | null;
    tags?: string[];
  };
  intelligence: {
    healthScore: number;
    healthLabel: "new" | "healthy" | "cooling" | "at_risk";
    lastInteractionAt?: string | null;
    daysSinceLastTouch?: number | null;
    cadenceLabel?: string | null;
    pulseSummary: string;
    needsTouchReason?: string | null;
    nextBestActions: Array<{ label: string; action: "note" | "task" | "deal" | "followup" | "email" }>;
  };
  timeline: Array<{
    id: string;
    type: "note" | "email" | "meeting" | "task" | "deal";
    title: string;
    body?: string | null;
    at: string;
    href?: string | null;
  }>;
  crm: {
    deals: Array<{ id: string; title: string; stage?: string | null; amount?: number | null; updatedAt?: string | null }>;
    tasks: Array<{ id: string; title: string; dueAt?: string | null; status: "open" | "done" }>;
    followups: Array<{ id: string; title: string; dueAt?: string | null; status: "open" | "done" }>;
  };
  meta?: Record<string, any>;
}

export async function getPersonDossier(personId: string, clerkUserId: string): Promise<PersonDossier> {
  try {
    // Resolve Clerk ID to database UUID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", clerkUserId)
      .single();

    const dbUserId = userRow?.id || clerkUserId;

    // Get person/contact
    const { data: contact } = await supabaseAdmin
      .from("crm_contacts")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("id", personId)
      .single();

    if (!contact) {
      return {
        ok: false,
        person: { id: personId, name: "Unknown" },
        intelligence: {
          healthScore: 0,
          healthLabel: "new",
          pulseSummary: "Person not found",
          nextBestActions: [],
        },
        timeline: [],
        crm: { deals: [], tasks: [], followups: [] },
      };
    }

    // Get relationship health
    const { data: health } = await supabaseAdmin
      .from("crm_relationship_health")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", personId)
      .maybeSingle();

    // Get interactions for timeline and health calculation
    const { data: interactions } = await supabaseAdmin
      .from("crm_interactions")
      .select("*")
      .eq("user_id", dbUserId)
      .eq("contact_id", personId)
      .order("occurred_at", { ascending: false })
      .limit(50);

    // Calculate health score and label
    const now = new Date();
    const lastInteraction = interactions && interactions.length > 0 ? interactions[0] : null;
    const lastInteractionAt = lastInteraction?.occurred_at || health?.last_interaction_at || null;
    
    let daysSinceLastTouch: number | null = null;
    if (lastInteractionAt) {
      daysSinceLastTouch = Math.floor(
        (now.getTime() - new Date(lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    let healthScore: number;
    let healthLabel: "new" | "healthy" | "cooling" | "at_risk";

    if (!lastInteractionAt) {
      healthScore = 20;
      healthLabel = "new";
    } else {
      if (daysSinceLastTouch! <= 7) {
        healthScore = 85;
        healthLabel = "healthy";
      } else if (daysSinceLastTouch! <= 14) {
        healthScore = 70;
        healthLabel = "healthy";
      } else if (daysSinceLastTouch! <= 30) {
        healthScore = 45;
        healthLabel = "cooling";
      } else {
        healthScore = 25;
        healthLabel = "at_risk";
      }
    }

    // Override with stored health if available
    if (health && health.score) {
      healthScore = health.score;
      if (healthScore >= 75) healthLabel = "healthy";
      else if (healthScore >= 50) healthLabel = "cooling";
      else healthLabel = "at_risk";
    }

    // Generate pulse summary
    let pulseSummary: string;
    let needsTouchReason: string | null = null;

    if (healthLabel === "new") {
      pulseSummary = "New relationship. Add a note or schedule a first touch.";
      needsTouchReason = "No interactions yet";
    } else {
      pulseSummary = `Last touch was ${daysSinceLastTouch} day${daysSinceLastTouch !== 1 ? "s" : ""} ago.`;
      
      if (daysSinceLastTouch! >= 14) {
        needsTouchReason = `Last touch ${daysSinceLastTouch} days ago`;
        pulseSummary += ` Best next action: Follow up to re-engage.`;
      } else if (daysSinceLastTouch! >= 7) {
        pulseSummary += ` Relationship is stable. Consider scheduling next touch.`;
      } else {
        pulseSummary += ` Relationship is healthy.`;
      }
    }

    // Determine cadence label
    const cadenceDays = health?.next_suggested_checkin_at
      ? Math.floor(
          (new Date(health.next_suggested_checkin_at).getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    let cadenceLabel: string | null = null;
    if (cadenceDays !== null) {
      if (cadenceDays <= 7) cadenceLabel = "weekly";
      else if (cadenceDays <= 14) cadenceLabel = "bi-weekly";
      else if (cadenceDays <= 30) cadenceLabel = "monthly";
      else if (cadenceDays <= 60) cadenceLabel = "bi-monthly";
      else cadenceLabel = "quarterly";
    }

    // Generate next best actions
    const nextBestActions: Array<{ label: string; action: "note" | "task" | "deal" | "followup" | "email" }> = [];

    if (daysSinceLastTouch === null || daysSinceLastTouch >= 14) {
      nextBestActions.push({ label: "Schedule Follow-up", action: "followup" });
    }

    nextBestActions.push({ label: "Add Note", action: "note" });
    nextBestActions.push({ label: "Create Task", action: "task" });

    // Get deals for this person
    const { data: deals } = await supabaseAdmin
      .from("crm_deals")
      .select("id, name, stage, amount, updated_at")
      .eq("user_id", dbUserId)
      .eq("primary_contact_id", personId)
      .not("stage", "in", "('won', 'lost')")
      .order("updated_at", { ascending: false });

    if (!deals || deals.length === 0) {
      nextBestActions.push({ label: "Create Deal", action: "deal" });
    }

    // Get tasks for this person from crm_tasks (canonical CRM table)
    const { data: tasks } = await supabaseAdmin
      .from("crm_tasks")
      .select("id, title, due_at, status")
      .eq("owner_user_id", clerkUserId)
      .eq("contact_id", personId)
      .in("status", ["pending", "in_progress", "open"])
      .order("due_at", { ascending: true, nullsFirst: true });

    // Get followups (tasks with "followup" or "Follow-up" in title)
    const { data: followups } = await supabaseAdmin
      .from("crm_tasks")
      .select("id, title, due_at, status")
      .eq("owner_user_id", clerkUserId)
      .eq("contact_id", personId)
      .ilike("title", "%follow-up%")
      .in("status", ["pending", "in_progress", "open"])
      .order("due_at", { ascending: true, nullsFirst: true });

    // Build timeline from interactions, tasks, and deals
    const timeline: PersonDossier["timeline"] = [];

    // Add interactions to timeline
    (interactions || []).forEach((i) => {
      timeline.push({
        id: i.id,
        type: i.type as any,
        title: i.subject || `${i.type} interaction`,
        body: i.summary || null,
        at: i.occurred_at,
        href: null,
      });
    });

    // Add tasks to timeline
    (tasks || []).forEach((task) => {
      timeline.push({
        id: task.id,
        type: "task",
        title: task.title,
        body: null,
        at: task.due_at || new Date().toISOString(),
        href: null,
      });
    });

    // Add deals to timeline
    (deals || []).forEach((deal) => {
      timeline.push({
        id: deal.id,
        type: "deal",
        title: deal.name,
        body: `Stage: ${deal.stage}${deal.amount ? ` | $${deal.amount.toLocaleString()}` : ""}`,
        at: deal.updated_at || new Date().toISOString(),
        href: `/crm/deals/${deal.id}`,
      });
    });

    // Sort timeline by date (newest first)
    timeline.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());

    return {
      ok: true,
      person: {
        id: contact.id,
        name: contact.full_name,
        email: contact.primary_email || null,
        phone: contact.primary_phone || null,
        company: contact.company_name || null,
        tags: contact.tags || [],
      },
      intelligence: {
        healthScore,
        healthLabel,
        lastInteractionAt,
        daysSinceLastTouch,
        cadenceLabel,
        pulseSummary,
        needsTouchReason,
        nextBestActions,
      },
      timeline: timeline.slice(0, 50), // Limit to 50 most recent
      crm: {
        deals: (deals || []).map((d) => ({
          id: d.id,
          title: d.name,
          stage: d.stage || null,
          amount: d.amount ? Number(d.amount) : null,
          updatedAt: d.updated_at || null,
        })),
        tasks: (tasks || []).map((t) => ({
          id: t.id,
          title: t.title,
          dueAt: t.due_at || null,
          status: (t.status === "done" || t.status === "completed" ? "done" : "open") as "open" | "done",
        })),
        followups: (followups || []).map((f) => ({
          id: f.id,
          title: f.title,
          dueAt: f.due_at || null,
          status: (f.status === "done" || f.status === "completed" ? "done" : "open") as "open" | "done",
        })),
      },
      meta: {
        userIdUsed: dbUserId,
        clerkUserId,
      },
    };
  } catch (err) {
    console.error("[PersonDossier] Error:", err);
    return {
      ok: false,
      person: { id: personId, name: "Unknown" },
      intelligence: {
        healthScore: 0,
        healthLabel: "new",
        pulseSummary: "Error loading dossier",
        nextBestActions: [],
      },
      timeline: [],
      crm: { deals: [], tasks: [], followups: [] },
      meta: { error: err instanceof Error ? err.message : String(err) },
    };
  }
}

