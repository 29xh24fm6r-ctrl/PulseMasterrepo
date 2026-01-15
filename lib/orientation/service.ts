import { createClient } from '@/lib/supabase/server';
import { LifeState } from '@/lib/life-state/types';
import { DailyOrientation } from './types';
import { generateDailyOrientation } from './generateDailyOrientation';

export async function getOrGenerateDailyOrientation(userId: string, currentState: LifeState): Promise<DailyOrientation> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // 1. Check for existing snapshot
    const { data: existing } = await supabase
        .from('daily_orientation_snapshots')
        .select('*')
        .eq('owner_user_id', userId)
        .eq('day', today)
        .single();

    if (existing) {
        return {
            date: existing.day,
            dominant_state: existing.dominant_state as any,
            primary_reason: existing.primary_reason,
            secondary_factors: existing.secondary_factors || [],
            confidence: existing.confidence,
            changed_since_yesterday: false // Simplification for now
        };
    }

    // 2. Generate new if not found

    // Fetch last 7 days of feedback for calibration
    const { data: feedbackHistory } = await supabase
        .from('orientation_feedback')
        .select('*')
        .eq('owner_user_id', userId)
        .gte('day', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    // Format for generator
    const formattedFeedback = (feedbackHistory || []).map(f => ({ day: f.day, feedback: f.feedback as 'accurate' | 'off' }));

    const orientation = generateDailyOrientation(currentState, null, formattedFeedback);

    // 3. Persist
    const { error } = await supabase
        .from('daily_orientation_snapshots')
        .insert({
            owner_user_id: userId,
            day: today,
            dominant_state: orientation.dominant_state,
            primary_reason: orientation.primary_reason,
            secondary_factors: orientation.secondary_factors,
            confidence: orientation.confidence
        });

    if (error) {
        console.error("Failed to persist daily orientation:", error);
        // Fallback: return generated but don't crash
    }

    return orientation;
}

export async function checkDailyFeedback(userId: string): Promise<boolean> {
    const supabase = await createClient();
    const today = new Date().toISOString().split('T')[0];

    // Use count instead of single to be safe
    const { count } = await supabase
        .from('orientation_feedback')
        .select('*', { count: 'exact', head: true })
        .eq('owner_user_id', userId)
        .eq('day', today);

    return (count || 0) > 0;
}
