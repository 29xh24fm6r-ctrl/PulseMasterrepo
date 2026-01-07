import { supabaseAdmin } from "@/lib/supabase";

export type Task = {
    id: string;
    user_id_uuid: string;
    title: string;
    description?: string;
    status: string; // pending, active, done, blocked
    priority: string;
    due_at?: string;
    completed_at?: string;
    project?: string;
    xp?: number;
};

const PRIORITY_MAP: Record<string, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4
};

const PRIORITY_MAP_REV: Record<number, string> = {
    1: 'low',
    2: 'medium',
    3: 'high',
    4: 'critical'
};

function mapTaskFromDB(t: any): Task {
    return {
        ...t,
        title: t.title || t.name || "Untitled",
        due_at: t.due_at || t.due_date,
        status: t.status === 'in_progress' ? 'active' : t.status,
        // If priority is number from DB, map to string. If explicitly string (legacy), keep it.
        priority: typeof t.priority === 'number' ? (PRIORITY_MAP_REV[t.priority] || 'medium') : (t.priority || 'medium')
    };
}

export async function getTasks(userId: string) {
    const { data, error } = await supabaseAdmin
        .from("tasks")
        .select("*")
        .eq("user_id_uuid", userId)
        .order("due_at", { ascending: true, nullsFirst: false });

    if (error) throw error;

    return data.map(mapTaskFromDB);
}

export async function createTask(userId: string, task: Partial<Task>) {
    // Map application 'priority' (string) to DB 'priority' (number)
    const dbPriority = task.priority ? (PRIORITY_MAP[task.priority] || 2) : 2;
    const taskTitle = task.title || "Untitled";

    const { data, error } = await supabaseAdmin
        .from("tasks")
        .insert({
            ...task,
            title: taskTitle, // Ensure title is string
            name: taskTitle,  // DB requires name
            priority: dbPriority,
            user_id_uuid: userId,
            owner_user_id_legacy: userId
        })
        .select()
        .single();

    if (error) throw error;
    return mapTaskFromDB(data);
}

export async function completeTask(userId: string, taskId: string) {
    const { data, error } = await supabaseAdmin
        .from("tasks")
        .update({
            status: 'done',
            completed_at: new Date().toISOString()
        })
        .eq("id", taskId)
        .eq("user_id_uuid", userId)
        .select()
        .single();

    if (error) throw error;
    return mapTaskFromDB(data);
}
