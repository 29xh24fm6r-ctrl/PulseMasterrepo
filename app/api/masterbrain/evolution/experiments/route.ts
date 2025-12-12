// Master Brain Evolution - Experiments API
// app/api/masterbrain/evolution/experiments/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createExperimentForIdeas } from '@/lib/masterbrain/evolution/experiments';
import { supabaseAdminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status');

    let query = supabaseAdminClient
      .from('system_experiments')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: experiments, error } = await query;

    if (error) throw error;

    return NextResponse.json({ experiments: experiments ?? [] });
  } catch (err) {
    console.error('[API] Master Brain evolution experiments fetch failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch experiments' },
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
    const { name, ideaIds, hypothesis } = body;

    if (!name || !ideaIds || ideaIds.length === 0) {
      return NextResponse.json(
        { error: 'name and ideaIds required' },
        { status: 400 }
      );
    }

    const experiment = await createExperimentForIdeas({
      name,
      ideaIds,
      hypothesis,
      createdBy: `user:${userId}`,
    });

    return NextResponse.json({ experiment });
  } catch (err) {
    console.error('[API] Master Brain evolution experiment creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create experiment' },
      { status: 500 }
    );
  }
}


