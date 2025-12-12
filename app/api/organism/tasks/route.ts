// Unified Organism API - Tasks
// app/api/organism/tasks/route.ts

import { NextRequest } from "next/server";
import { requireClerkUserId } from "@/lib/auth/requireUser";
import { supabaseServer } from "@/lib/supabase/server";
import { jsonOk, handleRouteError } from "@/lib/api/routeErrors";
import { createTask, TaskInput } from "@/lib/organism";

export async function GET(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const supabase = supabaseServer();

    const searchParams = request.nextUrl.searchParams;
    const contact_id = searchParams.get("contact_id") || undefined;
    const deal_id = searchParams.get("deal_id") || undefined;
    const status = searchParams.get("status") || undefined;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    let query = supabase
      .from("crm_tasks")
      .select(`
        *,
        contact:crm_contacts(full_name),
        deal:crm_deals(name)
      `)
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (contact_id) query = query.eq("contact_id", contact_id);
    if (deal_id) query = query.eq("deal_id", deal_id);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return jsonOk({ tasks: data || [] });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await requireClerkUserId();
    const body = await request.json();

    const input: TaskInput = {
      title: body.title,
      description: body.description,
      due_date: body.due_date,
      priority: body.priority,
      contact_id: body.contact_id,
      organization_id: body.organization_id,
      deal_id: body.deal_id,
      status: body.status,
    };

    const result = await createTask(userId, input);

    return jsonOk({
      task_id: result.task_id,
      message: "Task created",
    });
  } catch (err: unknown) {
    return handleRouteError(err);
  }
}

