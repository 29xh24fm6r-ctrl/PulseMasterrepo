// Mythic Intelligence - Session Insight API
// app/api/mythic/session/insight/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncMythicToIdentity } from '@/lib/mythic/integration';

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
    const { sessionId, prompt, response, tags } = body;

    if (!sessionId || !prompt || !response) {
      return NextResponse.json(
        { error: 'sessionId, prompt, and response required' },
        { status: 400 }
      );
    }

    const dbUserId = await resolveUserId(userId);

    // Get existing session
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('mythic_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', dbUserId)
      .maybeSingle();

    if (sessionError) throw sessionError;
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Append insight
    const insights = session.insights ?? [];
    insights.push({
      prompt,
      response,
      tags: tags ?? [],
      created_at: new Date().toISOString(),
    });

    const { error: updateError } = await supabaseAdmin
      .from('mythic_sessions')
      .update({ insights })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    // Optionally sync to Identity Engine
    if (tags?.includes('identity')) {
      await syncMythicToIdentity(userId).catch((err) => {
        console.error('[Mythic] Identity sync failed', err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[API] Mythic session insight failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save insight' },
      { status: 500 }
    );
  }
}


