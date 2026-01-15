'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitOrientationFeedback(feedback: 'accurate' | 'off') {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        throw new Error("Unauthorized");
    }

    const today = new Date().toISOString().split('T')[0];

    // 1. Persist Feedback
    // "On conflict do nothing" or just try insert. The UNIQUE constraint handles 1 per day.
    const { error } = await supabase
        .from('orientation_feedback')
        .insert({
            owner_user_id: user.id,
            day: today,
            feedback: feedback
        });

    if (error) {
        // If strict singleton, checking error code 23505 (unique_violation) is good practice, 
        // but for this MVP, if it fails, it fails (likely already submitted).
        console.warn("Feedback submission prevented (likely duplicate):", error.code);
        return;
    }

    // 2. Log Learning Artifact (Bounded + Auditable)
    // We log what "lesson" the system extracts from this.
    // accurate -> Trust Delta +0.02
    // off -> Trust Delta -0.05
    const trustDelta = feedback === 'accurate' ? 0.02 : -0.05;
    const pattern = feedback === 'accurate'
        ? "Orientation resonance confirmed"
        : "Orientation rejected";

    // Using autonomy_learning_artifacts from Phase 12
    await supabase.from('autonomy_learning_artifacts').insert({
        owner_user_id: user.id,
        autonomy_event_id: null, // Not tied to a specific execution event
        pattern_detected: pattern,
        confidence_adjustment: 0, // We modulate trust score, not direct confidence yet (calib logic handles that)
        domain_trust_delta: trustDelta,
        timing_adjustment: null
    });

    // 3. Update Domain Trust Profile (Orientation Domain)
    // We explicitly track "orientation" as a trust domain.
    // Upsert logic:
    const { data: profile } = await supabase
        .from('domain_trust_profile')
        .select('trust_score')
        .eq('owner_user_id', user.id)
        .eq('domain', 'orientation')
        .single();

    let currentScore = profile?.trust_score ?? 0.5;
    let newScore = Math.max(0, Math.min(1, currentScore + trustDelta));

    await supabase.from('domain_trust_profile').upsert({
        owner_user_id: user.id,
        domain: 'orientation',
        trust_score: newScore,
        updated_at: new Date().toISOString()
    }, { onConflict: 'owner_user_id, domain' });

    revalidatePath('/bridge');
}
