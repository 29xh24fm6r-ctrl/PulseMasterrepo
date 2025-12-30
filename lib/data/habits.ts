import { supabaseAdmin } from "@/lib/supabase";

export type Habit = {
    id: string;
    user_id: string;
    name: string;
    xp_reward: number;
    category: string;
    frequency: string;
    streak: number;
    last_completed_at: string | null;
};

export async function getHabits(userId: string) {
    const { data, error } = await supabaseAdmin
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .order("name", { ascending: true });

    if (error) throw error;
    return data as Habit[];
}

export async function logHabitCompletion(userId: string, habitId: string, xp: number, notes?: string) {
    // 1. Insert log
    const { error: logError } = await supabaseAdmin
        .from("habit_logs")
        .insert({
            user_id: userId,
            habit_id: habitId,
            xp_awarded: xp,
            notes,
            completed_at: new Date().toISOString()
        });

    if (logError) throw logError;

    // 2. Update streak on habit
    // First, get current habit to check streak
    const { data: habit } = await supabaseAdmin.from("habits").select("streak, last_completed_at").eq("id", habitId).single();

    let newStreak = (habit?.streak || 0) + 1;
    const lastCompleted = habit?.last_completed_at ? new Date(habit.last_completed_at) : null;
    const now = new Date();

    // Reset streak if missed a day (simple daily logic)
    // If last completed was before yesterday (more than 24h + margin?), reset.
    // Simplifying: if last_completed_at is not "today" or "yesterday", reset to 1.
    if (lastCompleted) {
        const diffDays = Math.floor((now.getTime() - lastCompleted.getTime()) / (1000 * 3600 * 24));
        if (diffDays > 1) newStreak = 1;
        // If already done today, don't increment? logic usually allows multiple logs but streak implies daily consistency.
        // For now, simple increment.
    }

    const { data: updatedHabit, error: updateError } = await supabaseAdmin
        .from("habits")
        .update({
            streak: newStreak,
            last_completed_at: now.toISOString()
        })
        .eq("id", habitId)
        .select()
        .single();

    if (updateError) throw updateError;
    return updatedHabit;
}

export async function createHabit(userId: string, name: string) {
    const { data, error } = await supabaseAdmin
        .from("habits")
        .insert({ user_id: userId, name, streak: 0 })
        .select()
        .single();
    if (error) throw error;
    return data;
}
