import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Parse natural language time into ISO datetime
function parseTimeExpression(timeStr: string, baseDate = new Date()): Date {
  const lowerTime = timeStr.toLowerCase();
  const result = new Date(baseDate);

  // Handle relative days
  if (lowerTime.includes("tomorrow")) {
    result.setDate(result.getDate() + 1);
  } else if (lowerTime.includes("next week")) {
    result.setDate(result.getDate() + 7);
  } else if (lowerTime.includes("monday")) {
    const day = 1;
    result.setDate(result.getDate() + ((day + 7 - result.getDay()) % 7 || 7));
  } else if (lowerTime.includes("tuesday")) {
    const day = 2;
    result.setDate(result.getDate() + ((day + 7 - result.getDay()) % 7 || 7));
  } else if (lowerTime.includes("wednesday")) {
    const day = 3;
    result.setDate(result.getDate() + ((day + 7 - result.getDay()) % 7 || 7));
  } else if (lowerTime.includes("thursday")) {
    const day = 4;
    result.setDate(result.getDate() + ((day + 7 - result.getDay()) % 7 || 7));
  } else if (lowerTime.includes("friday")) {
    const day = 5;
    result.setDate(result.getDate() + ((day + 7 - result.getDay()) % 7 || 7));
  }

  // Handle time of day
  const timeMatch = lowerTime.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (timeMatch) {
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2] || "0");
    const meridiem = timeMatch[3]?.toLowerCase();

    if (meridiem === "pm" && hours < 12) hours += 12;
    if (meridiem === "am" && hours === 12) hours = 0;
    if (!meridiem && hours < 8) hours += 12; // Assume PM for business hours

    result.setHours(hours, minutes, 0, 0);
  } else if (lowerTime.includes("morning")) {
    result.setHours(9, 0, 0, 0);
  } else if (lowerTime.includes("noon") || lowerTime.includes("lunch")) {
    result.setHours(12, 0, 0, 0);
  } else if (lowerTime.includes("afternoon")) {
    result.setHours(14, 0, 0, 0);
  } else if (lowerTime.includes("evening")) {
    result.setHours(18, 0, 0, 0);
  }

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { function_name, arguments: args } = await req.json();
    let result: any;

    switch (function_name) {
      // ==================== CALENDAR ====================
      case "get_calendar_today": {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
        
        const { data: events } = await supabase
          .from("calendar_events")
          .select("*")
          .eq("user_id", userId)
          .gte("start_time", startOfDay)
          .lte("start_time", endOfDay)
          .order("start_time", { ascending: true });

        result = {
          events: (events || []).map(e => ({
            id: e.id,
            title: e.title || e.summary,
            start: e.start_time,
            end: e.end_time,
            location: e.location,
            attendees: e.attendees
          })),
          count: events?.length || 0
        };
        break;
      }

      case "create_calendar_event": {
        const { title, start_time, duration_minutes = 60, location, description, attendees } = args || {};

        let startDate: Date;
        if (start_time) {
          startDate = new Date(start_time);
          if (isNaN(startDate.getTime())) {
            startDate = parseTimeExpression(start_time);
          }
        } else {
          startDate = new Date();
          startDate.setHours(startDate.getHours() + 1, 0, 0, 0);
        }

        const endDate = new Date(startDate.getTime() + duration_minutes * 60 * 1000);

        const { data: event, error } = await supabase
          .from("calendar_events")
          .insert({
            user_id: userId,
            title,
            summary: title,
            start_time: startDate.toISOString(),
            end_time: endDate.toISOString(),
            location: location || null,
            description: description || null,
            attendees: attendees || [],
            event_type: "meeting",
            source: "voice",
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          result = { error: "Failed to create event" };
        } else {
          result = {
            success: true,
            event: { id: event.id, title: event.title },
            message: `Scheduled "${title}" for ${startDate.toLocaleDateString()} at ${startDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
          };
        }
        break;
      }

      case "update_calendar_event": {
        const { event_id, title, start_time, location } = args || {};
        const updates: any = {};

        if (title) updates.title = title;
        if (location) updates.location = location;
        if (start_time) {
          const startDate = parseTimeExpression(start_time);
          updates.start_time = startDate.toISOString();
          
          const { data: existing } = await supabase
            .from("calendar_events")
            .select("start_time, end_time")
            .eq("id", event_id)
            .single();
          
          if (existing) {
            const duration = new Date(existing.end_time).getTime() - new Date(existing.start_time).getTime();
            updates.end_time = new Date(startDate.getTime() + duration).toISOString();
          }
        }

        const { data: event, error } = await supabase
          .from("calendar_events")
          .update(updates)
          .eq("id", event_id)
          .eq("user_id", userId)
          .select()
          .single();

        result = error ? { error: "Failed to update" } : { success: true, message: `Updated "${event.title}"` };
        break;
      }

      case "delete_calendar_event": {
        const { event_id } = args || {};
        const { data: event } = await supabase
          .from("calendar_events")
          .select("title")
          .eq("id", event_id)
          .eq("user_id", userId)
          .single();

        await supabase.from("calendar_events").delete().eq("id", event_id).eq("user_id", userId);
        result = { success: true, message: `Cancelled "${event?.title || "event"}"` };
        break;
      }

      // ==================== DAY PLAN ====================
      case "get_day_plan": {
        const today = new Date().toISOString().split("T")[0];
        const { data: plan } = await supabase
          .from("day_plans")
          .select("*, day_plan_items(*)")
          .eq("user_id", userId)
          .eq("date", today)
          .single();

        result = plan ? {
          focus: plan.focus_area,
          energy: plan.energy_allocation,
          items: (plan.day_plan_items || []).map((i: any) => ({
            id: i.id,
            title: i.title,
            type: i.item_type,
            priority: i.priority,
            status: i.status,
            scheduled: i.scheduled_time
          }))
        } : { message: "No plan generated for today yet" };
        break;
      }

      // ==================== TASKS ====================
      case "get_tasks": {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .in("status", ["pending", "in_progress"])
          .order("priority", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(20);

        result = {
          tasks: (tasks || []).map(t => ({
            id: t.id,
            title: t.title,
            priority: t.priority,
            status: t.status,
            due_date: t.due_date
          })),
          count: tasks?.length || 0
        };
        break;
      }

      case "get_tasks_by_priority": {
        const { priority } = args || {};
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .eq("priority", priority)
          .in("status", ["pending", "in_progress"])
          .limit(10);

        result = {
          tasks: (tasks || []).map(t => ({ id: t.id, title: t.title, status: t.status })),
          count: tasks?.length || 0
        };
        break;
      }

      case "create_task": {
        const { title, priority = "medium", due_date, scheduled_time } = args || {};
        const { data: task, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title,
            priority,
            due_date: due_date || null,
            status: "pending",
            created_at: new Date().toISOString()
          })
          .select()
          .single();

        result = error 
          ? { error: "Failed to create task" } 
          : { success: true, task: { id: task.id, title: task.title }, message: `Added: ${title}` };
        break;
      }

      case "complete_task": {
        const { task_id, task_identifier } = args || {};
        const identifier = task_id || task_identifier;
        
        let taskToComplete;
        if (identifier) {
          const { data: byId } = await supabase
            .from("tasks")
            .select("id, title")
            .eq("user_id", userId)
            .eq("id", identifier)
            .single();
          
          if (byId) {
            taskToComplete = byId;
          } else {
            const { data: byTitle } = await supabase
              .from("tasks")
              .select("id, title")
              .eq("user_id", userId)
              .ilike("title", `%${identifier}%`)
              .in("status", ["pending", "in_progress"])
              .limit(1)
              .single();
            taskToComplete = byTitle;
          }
        }

        if (taskToComplete) {
          await supabase
            .from("tasks")
            .update({ status: "completed", completed_at: new Date().toISOString() })
            .eq("id", taskToComplete.id);
          result = { success: true, message: `Completed: ${taskToComplete.title}` };
        } else {
          result = { error: "Task not found" };
        }
        break;
      }

      case "prioritize_task": {
        const { task_identifier, priority } = args || {};
        const { data: task } = await supabase
          .from("tasks")
          .select("id, title")
          .eq("user_id", userId)
          .ilike("title", `%${task_identifier}%`)
          .limit(1)
          .single();

        if (task) {
          await supabase.from("tasks").update({ priority }).eq("id", task.id);
          result = { success: true, message: `Set ${task.title} to ${priority} priority` };
        } else {
          result = { error: "Task not found" };
        }
        break;
      }

      case "reschedule_task": {
        const { task_id, new_time } = args || {};
        const scheduledTime = parseTimeExpression(new_time);
        
        await supabase
          .from("tasks")
          .update({ scheduled_time: scheduledTime.toISOString() })
          .eq("id", task_id)
          .eq("user_id", userId);

        result = { success: true, message: `Rescheduled to ${scheduledTime.toLocaleString()}` };
        break;
      }

      // ==================== THIRD BRAIN ====================
      case "get_context": {
        const [{ data: memories }, { data: insights }, { data: events }] = await Promise.all([
          supabase.from("third_brain_memories").select("*").eq("user_id", userId).order("importance", { ascending: false }).limit(10),
          supabase.from("third_brain_insights").select("*").eq("user_id", userId).eq("status", "pending").limit(5),
          supabase.from("third_brain_events").select("*").eq("user_id", userId).order("occurred_at", { ascending: false }).limit(10)
        ]);

        result = {
          memories: memories?.map(m => ({ category: m.category, content: m.content })) || [],
          insights: insights?.map(i => ({ type: i.insight_type, content: i.content })) || [],
          recent_events: events?.map(e => ({ type: e.type, title: e.title, date: e.occurred_at })) || []
        };
        break;
      }

      case "search_memories": {
        const { query } = args || {};
        const { data: memories } = await supabase
          .from("third_brain_memories")
          .select("*")
          .eq("user_id", userId)
          .ilike("content", `%${query}%`)
          .order("importance", { ascending: false })
          .limit(10);

        result = {
          memories: (memories || []).map(m => ({
            category: m.category,
            content: m.content,
            importance: m.importance
          })),
          count: memories?.length || 0
        };
        break;
      }

      case "get_recent_events": {
        const { limit = 10 } = args || {};
        const { data: events } = await supabase
          .from("third_brain_events")
          .select("*")
          .eq("user_id", userId)
          .order("occurred_at", { ascending: false })
          .limit(limit);

        result = {
          events: (events || []).map(e => ({
            type: e.type,
            title: e.title,
            summary: e.summary,
            date: e.occurred_at
          }))
        };
        break;
      }

      case "get_insights": {
        const { data: insights } = await supabase
          .from("third_brain_insights")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(10);

        result = {
          insights: (insights || []).map(i => ({
            type: i.insight_type,
            content: i.content,
            status: i.status
          }))
        };
        break;
      }

      case "add_memory": {
        const { content, category = "general" } = args || {};
        const { error } = await supabase.from("third_brain_memories").insert({
          user_id: userId,
          content,
          category,
          importance: 5,
          created_at: new Date().toISOString()
        });
        result = error ? { error: "Failed to save" } : { success: true, message: "Got it, I'll remember that." };
        break;
      }

      // ==================== CONTACTS ====================
      case "search_contacts": {
        const { query } = args || {};
        const searchQuery = query || "";
        const { data: contacts } = await supabase
          .from("contacts")
          .select("*")
          .eq("user_id", userId)
          .or(`name.ilike.%${searchQuery}%,company.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
          .limit(5);

        result = {
          contacts: (contacts || []).map(c => ({
            id: c.id,
            name: c.name,
            company: c.company,
            email: c.email,
            phone: c.phone,
            notes: c.notes,
            last_contact: c.last_contact_at
          }))
        };
        break;
      }

      case "get_contact_intel": {
        const { contact_id } = args || {};
        const { data: contact } = await supabase
          .from("contacts")
          .select("*")
          .eq("id", contact_id)
          .eq("user_id", userId)
          .single();

        const { data: interactions } = await supabase
          .from("third_brain_events")
          .select("*")
          .eq("user_id", userId)
          .ilike("summary", `%${contact?.name}%`)
          .order("occurred_at", { ascending: false })
          .limit(5);

        result = contact ? {
          contact: {
            name: contact.name,
            company: contact.company,
            email: contact.email,
            phone: contact.phone,
            notes: contact.notes,
            relationship: contact.relationship,
            last_contact: contact.last_contact_at
          },
          recent_interactions: (interactions || []).map(i => ({
            type: i.type,
            summary: i.summary,
            date: i.occurred_at
          }))
        } : { error: "Contact not found" };
        break;
      }

      // ==================== EMOTIONS ====================
      case "log_emotion": {
        const { emotion, energy } = args || {};
        await supabase.from("emotional_checkins").insert({
          user_id: userId,
          emotion: emotion || "neutral",
          energy_level: energy || 5,
          created_at: new Date().toISOString()
        });
        result = { success: true, message: `Logged: feeling ${emotion}` };
        break;
      }

      // ==================== AUTONOMY ====================
      case "get_autonomy_suggestions": {
        const { data: actions } = await supabase
          .from("autonomy_actions")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("priority", { ascending: false })
          .limit(5);

        result = {
          suggestions: (actions || []).map(a => ({
            id: a.id,
            action: a.action,
            reason: a.reasoning,
            priority: a.priority
          })),
          count: actions?.length || 0
        };
        break;
      }

      case "approve_action": {
        const { action_id } = args || {};
        await supabase
          .from("autonomy_actions")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("id", action_id)
          .eq("user_id", userId);
        result = { success: true, message: "Action approved" };
        break;
      }

      case "dismiss_action": {
        const { action_id } = args || {};
        await supabase
          .from("autonomy_actions")
          .update({ status: "dismissed" })
          .eq("id", action_id)
          .eq("user_id", userId);
        result = { success: true, message: "Action dismissed" };
        break;
      }

      case "get_delegation_drafts": {
        const { data: drafts } = await supabase
          .from("delegated_drafts")
          .select("*")
          .eq("user_id", userId)
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5);

        result = {
          drafts: (drafts || []).map(d => ({
            id: d.id,
            type: d.type,
            target: d.target,
            subject: d.subject,
            preview: d.body?.substring(0, 100)
          })),
          count: drafts?.length || 0
        };
        break;
      }
// ==================== SIMULATIONS ====================
      case "run_simulation": {
        const { scenario } = args || {};
        try {
          const simRes = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "https://pulse-os-dashboard.vercel.app"}/api/simulations/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: scenario || "Quick simulation", description: scenario || "Voice simulation", horizon: "month" }),
          });
          if (simRes.ok) {
            const simData = await simRes.json();
            result = { success: true, summary: simData.scenario?.latestRun?.result_summary || "Simulation complete", insights: simData.scenario?.latestRun?.insights || [] };
          } else { result = { error: "Failed to run simulation" }; }
        } catch (e) { result = { error: "Simulation failed" }; }
        break;
      }

      case "journal_entry": {
        const { content, mood } = args || {};
        await supabase.from("journal_entries").insert({ user_id: userId, content: content || "", mood: mood || "neutral", entry_type: "voice", created_at: new Date().toISOString() });
        result = { success: true, message: "Journal entry saved." };
        break;
      }

      case "get_calendar": {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
        const { data: calEvents } = await supabase.from("calendar_events").select("*").eq("user_id", userId).gte("start_time", startOfDay).lte("start_time", endOfDay).order("start_time");
        result = { events: (calEvents || []).map(e => ({ title: e.title, start: e.start_time, end: e.end_time })), message: calEvents?.length ? `You have ${calEvents.length} events today` : "Your calendar is clear" };
        break;
      }
      default:
        result = { error: `Unknown function: ${function_name}` };
    }

    // Log the voice interaction
    try {
      await supabase.from("third_brain_events").insert({
        user_id: userId,
        type: "voice_function",
        source: "realtime_voice",
        title: `Voice: ${function_name}`,
        summary: JSON.stringify(args || {}).substring(0, 200),
        raw_payload: { function_name, args, result },
        occurred_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    } catch (e) {
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ result });
  } catch (error: any) {
    console.error("[Voice Function] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}