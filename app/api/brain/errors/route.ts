// Brain Errors API
// app/api/brain/errors/route.ts

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
    const limit = parseInt(searchParams.get('limit') || '50');
    const subsystemId = searchParams.get('subsystemId');
    const severity = searchParams.get('severity');
    const resolved = searchParams.get('resolved');

    const dbUserId = await resolveUserId(userId);

    let query = supabaseAdmin
      .from('brain_error_events')
      .select('*')
      .eq('user_id', dbUserId)
      .order('occurred_at', { ascending: false });

    if (subsystemId) {
      query = query.eq('subsystem_id', subsystemId);
    }

    if (severity) {
      query = query.eq('severity', severity);
    }

    if (resolved !== null) {
      query = query.eq('resolved', resolved === 'true');
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ errors: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


