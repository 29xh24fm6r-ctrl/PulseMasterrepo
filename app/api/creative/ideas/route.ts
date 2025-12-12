// Creative Ideas API
// app/api/creative/ideas/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateArtifactsForIdea } from '@/lib/creative/v2/artifacts';
import { reRankCreativeIdeasForSession } from '@/lib/creative/v2/evaluator';

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

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const status = searchParams.get('status');

    const dbUserId = await resolveUserId(userId);

    let query = supabaseAdmin
      .from('creative_ideas')
      .select('*')
      .eq('user_id', dbUserId)
      .order('score_overall', { ascending: false });

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ideas: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { ideaId, status, generateArtifacts, rerankSession } = body;

    const dbUserId = await resolveUserId(userId);

    if (status) {
      const { error } = await supabaseAdmin
        .from('creative_ideas')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', ideaId)
        .eq('user_id', dbUserId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    if (generateArtifacts && ideaId) {
      await generateArtifactsForIdea(userId, ideaId);
    }

    if (rerankSession) {
      const { data: idea } = await supabaseAdmin
        .from('creative_ideas')
        .select('session_id')
        .eq('id', ideaId)
        .eq('user_id', dbUserId)
        .limit(1);

      if (idea?.[0]?.session_id) {
        await reRankCreativeIdeasForSession(userId, idea[0].session_id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


