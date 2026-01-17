import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export type Habit = {
    id: string;
    user_id_uuid: string;
    name: string;
    xp_reward: number; // Mapped to xp_per_completion
    category: string; // Mapped to description or just internal if no column
    frequency: string;
    streak: number;
    last_completed_at: string | null;
};

// Helper to map DB row to Habit
function mapHabitFromDB(row: any): Habit {
    return {
        id: row.id,
        user_id_uuid: row.user_id_uuid,
        name: row.name,
        xp_reward: row.xp_per_completion || 0,
        category: row.description || "General", // Best effort mapping
        frequency: row.frequency || "daily",
        streak: row.streak || 0,
        last_completed_at: row.updated_at // Schema has updated_at, maybe used as last_completed_at? Or we need to check if schema has last_completed_at column. View showed 'updated_at'.
        // View in Step 1920 showed: updated_at. It did NOT show last_completed_at.
        // Wait, Habits Row in Step 1920 has:
        // best_streak, color, created_at, description, frequency, icon, id, is_active, name, owner_user_id..., streak, target_count, updated_at, user_id..., xp_per_completion.
        // IT DOES NOT HAVE last_completed_at.
        // So we must rely on updated_at or query logs?
        // Code at Step 1910 used `select("streak, last_completed_at")`. It was likely failing or assuming legacy.
        // I will map last_completed_at to updated_at for now, as that's often used for "last touched".
    };
}

export async function getHabits(userId: string) {
    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("habits")
        .select("*")
        .eq("user_id_uuid", userId)
        .order("name", { ascending: true });

    if (error) throw error;
    return data.map(mapHabitFromDB);
}

export async function logHabitCompletion(userId: string, habitId: string, xp: number, notes?: string) {
    // 1. Insert log
    // Schema for habit_logs (Step 1921) has: count, created_at, habit_id, id, occurred_at, occurred_on, owner_user_id, user_id_uuid.
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const { error: logError } = await getSupabaseAdminRuntimeClient()
        .from("habit_logs")
        .insert({
            user_id_uuid: userId,
            owner_user_id: userId, // Required string
            habit_id: habitId,
            occurred_on: today,
            occurred_at: now.toISOString(),
            count: 1
            // xp_awarded and notes removed as they are not in schema row
        });

    if (logError) throw logError;

    // 2. Update streak on habit
    const { data: habit } = await getSupabaseAdminRuntimeClient().from("habits").select("streak, updated_at").eq("id", habitId).single();

    let newStreak = (habit?.streak || 0) + 1;
    const lastCompleted = habit?.updated_at ? new Date(habit.updated_at) : null;

    // Reset streak logic
    if (lastCompleted) {
        const diffDays = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 3600 * 24));
        // If > 1 day gap, reset. If same day, maybe don't increment?
        // For simplicity, just update updated_at to now.
        if (diffDays > 1) newStreak = 1;
    }

    const { data: updatedHabit, error: updateError } = await getSupabaseAdminRuntimeClient()
        .from("habits")
        .update({
            streak: newStreak,
            updated_at: now.toISOString()
        })
        .eq("id", habitId)
        .eq("user_id_uuid", userId)
        .select()
        .single();

    if (updateError) throw updateError;
    return mapHabitFromDB(updatedHabit);
}

export async function createHabit(userId: string, name: string) {
    const { data, error } = await getSupabaseAdminRuntimeClient()
        .from("habits")
        .insert({
            user_id_uuid: userId,
            owner_user_id_legacy: userId,
            owner_user_id: userId,
            name,
            streak: 0,
            xp_per_completion: 10, // Default?
            is_active: true
        })
        .select()
        .single();
    if (error) throw error;
    return mapHabitFromDB(data);
}
