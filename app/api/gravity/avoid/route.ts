import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    try {
        const supabase = createClient();
        const { targetId, dwellMs, revisitCount } = await req.json();

        if (!targetId) {
            return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
        }

        // 1. Get current stats
        const { data: task, error: fetchError } = await supabase
            .from('tasks')
            .select('avoidance_count, total_dwell_ms, gravity_score')
            .eq('id', targetId)
            .single();

        if (fetchError || !task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // 2. Increment Avoidance
        // We only count it as "Avoidance" if the user revisited it multiple times or dwelled long without action.
        const isAvoidance = revisitCount > 2 || dwellMs > 5000;

        const newAvoidanceCount = isAvoidance ? (task.avoidance_count || 0) + 1 : (task.avoidance_count || 0);
        const newDwellTotal = (task.total_dwell_ms || 0) + dwellMs;

        // 3. Update Database (Trigger will auto-recalculate Gravity Score)
        const { error: updateError } = await supabase
            .from('tasks')
            .update({
                avoidance_count: newAvoidanceCount,
                total_dwell_ms: newDwellTotal,
                last_interaction_ts: new Date().toISOString()
            })
            .eq('id', targetId);

        if (updateError) throw updateError;

        return NextResponse.json({ success: true, gravity_increased: isAvoidance });

    } catch (error) {
        console.error('Gravity API Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
