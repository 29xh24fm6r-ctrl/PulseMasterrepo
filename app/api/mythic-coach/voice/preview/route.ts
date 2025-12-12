// Mythic Coach Voice - Preview API
// app/api/mythic-coach/voice/preview/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMythicCoachVoiceForSession } from '@/lib/mythic_coach/voice/strategy';
import { supabaseAdminClient } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);

    const [voiceResult, archetypesRes, emotionRes] = await Promise.all([
      getMythicCoachVoiceForSession(userId),
      supabaseAdminClient
        .from('archetype_snapshots')
        .select('*')
        .eq('user_id', dbUserId)
        .order('snapshot_time', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdminClient
        .from('emotion_state_daily')
        .select('*')
        .eq('user_id', dbUserId)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    return NextResponse.json({
      voiceProfileId: voiceResult.voiceProfileId,
      styleOverrides: voiceResult.styleOverrides,
      archetypeContext: archetypesRes.data,
      emotionContext: emotionRes.data,
    });
  } catch (err) {
    console.error('[API] Mythic Coach voice preview failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to preview voice' },
      { status: 500 }
    );
  }
}


