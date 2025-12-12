/**
 * Task Management
 * Creates tasks linked to canonical entities
 * lib/organism/tasks.ts
 */

import { supabaseServer } from "@/lib/supabase/server";
import { TaskInput } from "./types";

/**
 * Create a task linked to CRM entities
 */
export async function createTask(
  userId: string,
  input: TaskInput
): Promise<{ task_id: string }> {
  const supabase = supabaseServer();

  const { data: task, error } = await supabase
    .from("crm_tasks")
    .insert({
      owner_user_id: userId,
      title: input.title,
      description: input.description || null,
      due_date: input.due_date || null,
      priority: input.priority || "medium",
      status: input.status || "pending",
      contact_id: input.contact_id || null,
      organization_id: input.organization_id || null,
      deal_id: input.deal_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`Failed to create task: ${error.message}`);
  }

  return {
    task_id: task.id,
  };
}

