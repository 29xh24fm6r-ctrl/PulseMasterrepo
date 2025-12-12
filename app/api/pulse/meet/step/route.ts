// Meet Pulse - Step Response API
// app/api/pulse/meet/step/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import { applyMeetPulseStepResponse } from '@/lib/meet_pulse/onboarding_flow';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionId, stepId, response } = body;

    if (!sessionId || !stepId) {
      return NextResponse.json({ error: 'Missing sessionId or stepId' }, { status: 400 });
    }

    // Get step from session (stored in narrative_intro or steps_completed)
    // For now, we'll reconstruct the step from the stored script
    // In production, you might want to store the full script in the session
    const dbUserId = await resolveUserId(userId);
    const { data: session } = await supabaseAdmin
      .from('pulse_introduction_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', dbUserId)
      .limit(1);

    if (!session?.[0]) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // For now, create a minimal step object
    // In production, you'd reconstruct from stored script
    const step = {
      id: stepId,
      type: 'preference_choice' as const,
      title: 'Preference',
      body: 'Set your preference',
    };

    await applyMeetPulseStepResponse(userId, sessionId, step, response);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Meet Pulse step failed', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process step' },
      { status: 500 }
    );
  }
}


