import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import TasksList from "@/components/crm/tasks-list";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function CrmTasksPage() {
  const { userId } = await auth();
  if (!userId) {
    return <div className="p-8 text-red-400">Unauthorized</div>;
  }

  // Resolve user UUID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  // Get open CRM tasks (scoped by owner_user_id = Clerk ID)
  const { data: tasks } = await supabaseAdmin
    .from("crm_tasks")
    .select("id, title, description, status, priority, due_at, created_at, contact_id")
    .eq("owner_user_id", userId)
    .in("status", ["pending", "in_progress", "open"])
    .order("priority", { ascending: false })
    .order("due_at", { ascending: true, nullsFirst: true })
    .limit(50);

  return <TasksList tasks={tasks || []} />;
}

