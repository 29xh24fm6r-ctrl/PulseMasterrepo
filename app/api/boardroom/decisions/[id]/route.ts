// Boardroom Brain - Decision Detail API
// app/api/boardroom/decisions/[id]/route.ts

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
    const decisionId = params.id;

    const [decisionRes, optionsRes, votesRes, scenariosRes] = await Promise.all([
      supabaseAdminClient
        .from('decisions')
        .select('*, strategic_domains(*), strategic_objectives(*)')
        .eq('id', decisionId)
        .eq('user_id', dbUserId)
        .maybeSingle(),
      supabaseAdminClient
        .from('decision_options')
        .select('*')
        .eq('decision_id', decisionId)
        .order('created_at', { ascending: true }),
      supabaseAdminClient
        .from('executive_council_votes')
        .select('*, executive_council_members(*), decision_options(*)')
        .eq('decision_id', decisionId),
      supabaseAdminClient
        .from('decision_scenarios')
        .select('*, decision_options(*)')
        .eq('decision_id', decisionId)
        .order('created_at', { ascending: true }),
    ]);

    if (decisionRes.error) throw decisionRes.error;
    if (!decisionRes.data) {
      return NextResponse.json({ error: 'Decision not found' }, { status: 404 });
    }

    return NextResponse.json({
      decision: decisionRes.data,
      options: optionsRes.data ?? [],
      votes: votesRes.data ?? [],
      scenarios: scenariosRes.data ?? [],
    });
  } catch (err) {
    console.error('[API] Boardroom decision detail failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch decision' },
      { status: 500 }
    );
  }
}


