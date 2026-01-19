import { NextRequest, NextResponse } from 'next/server';
import { runDailyPulse } from '@/lib/brain/background/runDailyPulse';

// This secret should be in env vars. For now, hardcoded for Phase 21 proof.
const CRON_SECRET = process.env.CRON_SECRET || 'pulse_cron_secret_123';

export async function POST(req: NextRequest) {
    const authHeader = req.headers.get('x-pulse-cron-secret');

    if (authHeader !== CRON_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, we would fetch all active users from DB.
    // For Phase 21 verification, we'll run for a specific target or default user.
    const targetUserId = 'user-1';

    console.log(`[Cron] Triggering daily run for ${targetUserId}`);

    // Cron runs are considered "absent" unless we have signal otherwise.
    // However, the spec says "absence" is determined by interaction history.
    // For now, we'll assume cron background runs might imply absence if no recent activity.
    // But `runDailyPulse` doesn't calculate absence yet, so we accept defaults.
    // We can simulate absence dampening by passing a flag if we detect staleness.
    // For this proof, we'll verify plain execution first.

    // Calculate absence (mock logic)
    // const lastSeen = await getLastSeen(targetUserId);
    // const isAbsent = (now - lastSeen) > 3 days;
    const isAbsent = false; // Default for now

    const result = await runDailyPulse(targetUserId, 'cron', isAbsent);

    return NextResponse.json({
        success: true,
        result
    });
}
