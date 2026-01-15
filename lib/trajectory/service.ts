import { createClient } from '@/lib/supabase/server';
import { LifeState } from '@/lib/life-state/types';
import { TrajectoryLine, TrajectoryHorizonDays } from './types';
import { generateTrajectory } from './generateTrajectory';

export async function getOrGenerateTrajectory(userId: string, currentState: LifeState): Promise<TrajectoryLine[]> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Check for existing snapshots for today
    const { data: existing } = await supabase
        .from('trajectory_snapshots')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('day', today);

    if (existing && existing.length > 0) {
        // Map back to TrajectoryLine type
        return existing.map(row => ({
            horizon_days: row.horizon_days as TrajectoryHorizonDays,
            headline: row.headline,
            confidence: row.confidence,
            drivers: row.drivers || [],
            updated_at: row.created_at
        }));
    }

    // 2. Generate if missing
    // (Ideally pass history if available)
    const lines = generateTrajectory(currentState, []);

    // 3. Persist (Best Effort)
    if (lines.length > 0) {
        const inserts = lines.map(l => ({
            owner_user_id: userId,
            day: today,
            horizon_days: l.horizon_days,
            headline: l.headline,
            confidence: l.confidence,
            drivers: l.drivers
        }));

        const { error } = await supabase
            .from('trajectory_snapshots')
            .insert(inserts);

        if (error) {
            console.error("Failed to persist trajectory snapshots:", error);
        }
    }

    return lines;
}
