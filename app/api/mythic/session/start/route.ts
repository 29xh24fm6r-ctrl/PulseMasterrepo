// Mythic Intelligence - Session Start API
// app/api/mythic/session/start/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { generateMythicSessionScript } from '@/lib/mythic/story_script';
import { synthesizeMythicSessionAudio } from '@/lib/mythic/voice';
import { supabaseAdmin } from '@/lib/supabase/admin';

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
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { sessionType, framework, focusChapterId } = body;

    if (!sessionType || !framework) {
      return NextResponse.json(
        { error: 'sessionType and framework required' },
        { status: 400 }
      );
    }

    const dbUserId = await resolveUserId(userId);

    // Generate script
    const { script, ssml } = await generateMythicSessionScript({
      userId,
      sessionType,
      framework,
      focusChapterId,
    });

    // Create session record
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mythic_sessions')
      .insert({
        user_id: dbUserId,
        session_type: sessionType,
        framework: framework,
        chapter_id: focusChapterId ?? null,
        script_generated: script,
        ssml: ssml,
        insights: [],
      })
      .select('*')
      .single();

    if (sessionError) throw sessionError;

    // Synthesize audio (async, will update session when done)
    synthesizeMythicSessionAudio({
      userId,
      sessionId: session.id,
      ssml,
    }).catch((err) => {
      console.error('[Mythic] Audio synthesis failed', err);
    });

    return NextResponse.json({ session });
  } catch (err) {
    console.error('[API] Mythic session start failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to start session' },
      { status: 500 }
    );
  }
}


