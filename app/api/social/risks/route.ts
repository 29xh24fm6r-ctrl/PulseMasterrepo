// Social Risks API
// app/api/social/risks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase';

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
    const resolved = searchParams.get('resolved') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    const dbUserId = await resolveUserId(userId);

    let query = supabaseAdmin
      .from('social_risk_events')
      .select('*')
      .eq('user_id', dbUserId)
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!resolved) {
      query = query.is('resolved_at', null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ risks: data ?? [] });
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
    const { riskId, resolved } = body;

    if (!riskId) {
      return NextResponse.json({ error: 'Missing riskId' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (resolved) {
      updatePayload.resolved_at = new Date().toISOString();
    } else {
      updatePayload.resolved_at = null;
    }

    const { error } = await supabaseAdmin
      .from('social_risk_events')
      .update(updatePayload)
      .eq('id', riskId)
      .eq('user_id', dbUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


