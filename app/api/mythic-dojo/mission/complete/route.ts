// Mythic Dojo - Mission Completion API
// app/api/mythic-dojo/mission/complete/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdminClient } from '@/lib/supabase';
import { awardMythicXpForMission } from '@/lib/mythic_dojo/v1/progress';
import { evaluateMythicAchievements } from '@/lib/mythic_dojo/v1/achievements';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { missionId, completionNotes } = body;

    if (!missionId) {
      return NextResponse.json({ error: 'missionId required' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    // Get mission
    const { data: mission, error: missionError } = await supabaseAdminClient
      .from('mythic_training_missions')
      .select('*')
      .eq('id', missionId)
      .eq('user_id', dbUserId)
      .maybeSingle();

    if (missionError) throw missionError;
    if (!mission) {
      return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
    }

    if (mission.status === 'completed') {
      return NextResponse.json({ error: 'Mission already completed' }, { status: 400 });
    }

    // Update mission status
    const { error: updateError } = await supabaseAdminClient
      .from('mythic_training_missions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        completion_notes: completionNotes ?? null,
      })
      .eq('id', missionId);

    if (updateError) throw updateError;

    // Award XP and update belt progress
    const missionDate = new Date();
    const progress = await awardMythicXpForMission(userId, {
      archetypeId: mission.archetype_id,
      missionId: mission.id,
      xp: mission.xp_value,
      missionDate,
    });

    // Evaluate achievements
    const newAchievements = await evaluateMythicAchievements(
      userId,
      mission.archetype_id,
      progress
    );

    return NextResponse.json({
      success: true,
      progress,
      newAchievements,
    });
  } catch (err) {
    console.error('[API] Mythic Dojo mission completion failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to complete mission' },
      { status: 500 }
    );
  }
}


