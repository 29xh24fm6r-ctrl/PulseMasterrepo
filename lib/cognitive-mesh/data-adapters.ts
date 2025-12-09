// Third Brain v3: Data Source Adapters
// Automatically ingest data from existing Pulse systems

import { createClient } from "@supabase/supabase-js";
import { CognitiveMesh } from "./index";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ============================================
// TASK INGESTION
// ============================================

export async function ingestTask(userId: string, task: any) {
  return CognitiveMesh.ingestRawEvent(userId, {
    source: "task",
    source_id: task.id,
    payload: {
      title: task.title,
      status: task.status,
      priority: task.priority,
      due_date: task.due_date,
      description: task.description,
      completed_at: task.completed_at,
    },
  });
}

export async function ingestAllTasks(userId: string) {
  const supabase = getSupabase();
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);

  let ingested = 0;
  for (const task of tasks || []) {
    try {
      await ingestTask(userId, task);
      ingested++;
    } catch (e) {
      console.error(`Failed to ingest task ${task.id}:`, e);
    }
  }
  return ingested;
}

// ============================================
// CONTACT INGESTION
// ============================================

export async function ingestContact(userId: string, contact: any) {
  return CognitiveMesh.ingestRawEvent(userId, {
    source: "contact",
    source_id: contact.id,
    payload: {
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      title: contact.title,
      relationship: contact.relationship,
      notes: contact.notes,
      last_contact_at: contact.last_contact_at,
    },
  });
}

export async function ingestAllContacts(userId: string) {
  const supabase = getSupabase();
  const { data: contacts } = await supabase
    .from("contacts")
    .select("*")
    .eq("user_id", userId);

  let ingested = 0;
  for (const contact of contacts || []) {
    try {
      await ingestContact(userId, contact);
      ingested++;
    } catch (e) {
      console.error(`Failed to ingest contact ${contact.id}:`, e);
    }
  }
  return ingested;
}

// ============================================
// CALENDAR EVENT INGESTION
// ============================================

export async function ingestCalendarEvent(userId: string, event: any) {
  return CognitiveMesh.ingestRawEvent(userId, {
    source: "calendar",
    source_id: event.id,
    occurred_at: event.start_time,
    payload: {
      title: event.title || event.summary,
      start_time: event.start_time,
      end_time: event.end_time,
      location: event.location,
      description: event.description,
      attendees: event.attendees,
      event_type: event.event_type,
    },
  });
}

export async function ingestRecentCalendarEvents(userId: string, days: number = 30) {
  const supabase = getSupabase();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data: events } = await supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .gte("start_time", since.toISOString())
    .order("start_time", { ascending: false });

  let ingested = 0;
  for (const event of events || []) {
    try {
      await ingestCalendarEvent(userId, event);
      ingested++;
    } catch (e) {
      console.error(`Failed to ingest calendar event ${event.id}:`, e);
    }
  }
  return ingested;
}

// ============================================
// DEAL INGESTION
// ============================================

export async function ingestDeal(userId: string, deal: any) {
  return CognitiveMesh.ingestRawEvent(userId, {
    source: "deal",
    source_id: deal.id,
    payload: {
      name: deal.name || deal.title,
      stage: deal.stage,
      value: deal.value || deal.amount,
      contact_name: deal.contact_name,
      company: deal.company,
      notes: deal.notes,
      probability: deal.probability,
      expected_close: deal.expected_close_date,
    },
  });
}

export async function ingestAllDeals(userId: string) {
  const supabase = getSupabase();
  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("user_id", userId);

  let ingested = 0;
  for (const deal of deals || []) {
    try {
      await ingestDeal(userId, deal);
      ingested++;
    } catch (e) {
      console.error(`Failed to ingest deal ${deal.id}:`, e);
    }
  }
  return ingested;
}

// ============================================
// VOICE INTERACTION INGESTION
// ============================================

export async function ingestVoiceInteraction(
  userId: string,
  sessionId: string,
  userMessage: string,
  assistantMessage: string
) {
  return CognitiveMesh.ingestRawEvent(userId, {
    source: "voice",
    source_id: sessionId,
    payload: {
      user_message: userMessage,
      assistant_message: assistantMessage,
      session_id: sessionId,
    },
  });
}

// ============================================
// EMOTIONAL CHECK-IN INGESTION
// ============================================

export async function ingestEmotionalCheckin(userId: string, checkin: any) {
  return CognitiveMesh.ingestRawEvent(userId, {
    source: "emotion",
    source_id: checkin.id,
    occurred_at: checkin.created_at,
    payload: {
      emotion: checkin.emotion,
      energy_level: checkin.energy_level,
      notes: checkin.notes,
      triggers: checkin.triggers,
    },
  });
}

// ============================================
// HABIT COMPLETION INGESTION
// ============================================

export async function ingestHabitCompletion(userId: string, habit: any, completion: any) {
  return CognitiveMesh.ingestRawEvent(userId, {
    source: "habit",
    source_id: completion.id,
    occurred_at: completion.completed_at || completion.created_at,
    payload: {
      habit_name: habit.name,
      habit_id: habit.id,
      completed: true,
      notes: completion.notes,
      streak: completion.streak,
    },
  });
}

// ============================================
// FULL SYNC
// ============================================

export async function syncAllDataSources(userId: string): Promise<{
  tasks: number;
  contacts: number;
  calendar: number;
  deals: number;
  total: number;
}> {
  console.log(`[Data Sync] Starting full sync for user ${userId}`);

  const tasks = await ingestAllTasks(userId);
  const contacts = await ingestAllContacts(userId);
  const calendar = await ingestRecentCalendarEvents(userId, 60);
  const deals = await ingestAllDeals(userId);

  const total = tasks + contacts + calendar + deals;
  console.log(`[Data Sync] Completed: ${total} events ingested`);

  return { tasks, contacts, calendar, deals, total };
}

// ============================================
// EXPORTS
// ============================================

export const DataAdapters = {
  // Individual
  ingestTask,
  ingestContact,
  ingestCalendarEvent,
  ingestDeal,
  ingestVoiceInteraction,
  ingestEmotionalCheckin,
  ingestHabitCompletion,
  
  // Bulk
  ingestAllTasks,
  ingestAllContacts,
  ingestRecentCalendarEvents,
  ingestAllDeals,
  
  // Full sync
  syncAllDataSources,
};

export default DataAdapters;