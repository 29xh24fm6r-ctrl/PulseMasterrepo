// Executive Council - Get Session API
// app/api/council/session/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdminClient } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);
    const sessionId = params.id;

    const [sessionRes, consensusRes, opinionsRes, membersRes] = await Promise.all([
      supabaseAdminClient
        .from('council_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', dbUserId)
        .maybeSingle(),
      supabaseAdminClient
        .from('council_consensus')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', dbUserId)
        .maybeSingle(),
      supabaseAdminClient
        .from('council_opinions')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', dbUserId),
      supabaseAdminClient
        .from('council_members')
        .select('*')
        .eq('user_id', dbUserId),
    ]);

    if (!sessionRes.data) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    const session = sessionRes.data;
    const consensus = consensusRes.data ?? null;
    const opinions = opinionsRes.data ?? [];
    const members = membersRes.data ?? [];

    // Enrich opinions with member display names
    const enrichedOpinions = opinions.map((opinion) => {
      const member = members.find((m) => m.role_id === opinion.member_role_id);
      return {
        memberRoleId: opinion.member_role_id,
        displayName: member?.display_name ?? opinion.member_role_id,
        stance: opinion.stance,
        confidence: opinion.confidence,
        recommendation: opinion.recommendation,
        rationale: opinion.rationale ?? {},
        suggestedConditions: opinion.suggested_conditions ?? [],
      };
    });

    return NextResponse.json({
      session,
      consensus,
      opinions: enrichedOpinions,
    });
  } catch (err) {
    console.error('[API] Get council session failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch session' },
      { status: 500 }
    );
  }
}


