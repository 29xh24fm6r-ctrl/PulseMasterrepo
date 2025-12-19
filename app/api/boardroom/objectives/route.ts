// Boardroom Brain - Objectives API
// app/api/boardroom/objectives/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    const { data: objectives, error } = await supabaseAdmin
      .from('strategic_objectives')
      .select('*, strategic_domains(*)')
      .eq('user_id', dbUserId)
      .eq('status', 'active')
      .order('priority', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ objectives: objectives ?? [] });
  } catch (err) {
    console.error('[API] Boardroom objectives fetch failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch objectives' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { domainId, name, description, timeframeStart, timeframeEnd, priority, successMetrics } = body;

    if (!domainId || !name) {
      return NextResponse.json({ error: 'domainId and name required' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    const { data: objective, error } = await supabaseAdmin
      .from('strategic_objectives')
      .insert({
        user_id: dbUserId,
        domain_id: domainId,
        name,
        description: description ?? null,
        timeframe_start: timeframeStart ?? null,
        timeframe_end: timeframeEnd ?? null,
        priority: priority ?? 3,
        success_metrics: successMetrics ?? [],
        status: 'active',
      })
      .select('*, strategic_domains(*)')
      .single();

    if (error) throw error;

    return NextResponse.json({ objective });
  } catch (err) {
    console.error('[API] Boardroom objective creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create objective' },
      { status: 500 }
    );
  }
}


