import { supabaseAdmin } from "@/lib/supabase";

export type Task = {
    id: string;
    user_id: string;
    title: string;
    description?: string;
    status: string; // pending, active, done, blocked
    priority: string;
    due_at?: string;
    completed_at?: string;
    project?: string;
    xp?: number;
};

export async function getTasks(userId: string) {
    const { data, error } = await supabaseAdmin
        .from("tasks")
        .select("*")
        .eq("user_id", userId)
        .order("due_at", { ascending: true, nullsFirst: false });

    if (error) throw error;

    // Map legacy fields if necessary
    return data.map((t: any) => ({
        ...t,
        title: t.title || t.name || "Untitled",
        due_at: t.due_at || t.due_date,
        status: t.status === 'in_progress' ? 'active' : t.status
    })) as Task[];
}

export async function createTask(userId: string, task: Partial<Task>) {
    const { data, error } = await supabaseAdmin
        .from("tasks")
        .insert({ ...task, user_id: userId })
        .select()
        .single();

    if (error) throw error;
    return data as Task;
}

export async function completeTask(userId: string, taskId: string) {
    const { data, error } = await supabaseAdmin
        .from("tasks")
        .update({
            status: 'done',
            completed_at: new Date().toISOString()
        })
        .eq("id", taskId)
        .eq("user_id", userId)
        .select()
        .single();

    if (error) throw error;
    return data as Task;
}
