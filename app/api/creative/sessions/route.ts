// Creative Sessions API
// app/api/creative/sessions/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { createCreativeSessionForUser } from '@/lib/creative/v2/sessions';
import { generateCreativeIdeasForSession } from '@/lib/creative/v2/generator';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
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

    const { data, error } = await supabaseAdmin
      .from('creative_sessions')
      .select('*')
      .eq('user_id', dbUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ sessions: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { topic, goal, domain, mode, context, generateIdeas } = body;

    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    const sessionId = await createCreativeSessionForUser(userId, {
      topic,
      goal,
      domain,
      mode,
      workspaceThread: context?.workspaceThread,
      destinyContext: context?.destiny,
      timelineContext: context?.timeline,
      cultureContexts: context?.cultureContexts,
      emotionState: context?.emotionState,
      somaticState: context?.somaticState,
    });

    let ideaIds;
    if (generateIdeas) {
      ideaIds = await generateCreativeIdeasForSession(userId, sessionId);
    }

    return NextResponse.json({ success: true, sessionId, ideaIds });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


