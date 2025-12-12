// Third Brain Graph v4 - Civilization State API
// app/api/third-brain/civilization/state/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdminClient } from '@/lib/supabase/admin';

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
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const searchParams = req.nextUrl.searchParams;
    const dateParam = searchParams.get('date');

    let query = supabaseAdminClient
      .from('civilization_domain_state')
      .select('*, civilization_domains(*)')
      .eq('civilization_domains.user_id', userId)
      .order('snapshot_date', { ascending: false });

    if (dateParam) {
      query = query.eq('snapshot_date', dateParam);
    } else {
      // Get latest for each domain
      query = query.limit(100); // Will filter client-side for latest per domain
    }

    const { data: states, error } = await query;

    if (error) throw error;

    // If no date specified, get latest per domain
    if (!dateParam && states) {
      const latestByDomain = new Map();
      for (const state of states) {
        const domainId = state.domain_id;
        const existing = latestByDomain.get(domainId);
        if (!existing || new Date(state.snapshot_date) > new Date(existing.snapshot_date)) {
          latestByDomain.set(domainId, state);
        }
      }
      return NextResponse.json({ states: Array.from(latestByDomain.values()) });
    }

    return NextResponse.json({ states: states ?? [] });
  } catch (err) {
    console.error('[API] Third Brain civilization state failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch civilization state' },
      { status: 500 }
    );
  }
}


