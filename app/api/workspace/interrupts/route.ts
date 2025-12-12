// Workspace Interrupts API
// app/api/workspace/interrupts/route.ts

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
    const unresolvedOnly = searchParams.get('unresolvedOnly') === 'true';

    const dbUserId = await resolveUserId(userId);

    let query = supabaseAdmin
      .from('workspace_interrupts')
      .select('*')
      .eq('user_id', dbUserId)
      .order('triggered_at', { ascending: false })
      .limit(20);

    if (unresolvedOnly) {
      query = query.is('resolved_at', null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ interrupts: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Resolve interrupt
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { interruptId, resolutionAction } = body;

    if (!interruptId) {
      return NextResponse.json({ error: 'interruptId is required' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    const { error } = await supabaseAdmin
      .from('workspace_interrupts')
      .update({
        resolved_at: new Date().toISOString(),
        resolution_action: resolutionAction || 'acknowledged',
      })
      .eq('id', interruptId)
      .eq('user_id', dbUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


