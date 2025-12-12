// Cortex Anomalies API
// app/api/cortex/anomalies/route.ts

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
    const area = searchParams.get('area') ?? 'work';
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const dbUserId = await resolveUserId(userId);

    let query = supabaseAdmin
      .from('cortex_anomalies')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('area_key', area)
      .order('window_date', { ascending: false })
      .order('severity', { ascending: false })
      .limit(50);

    if (from) {
      query = query.gte('window_date', from);
    }
    if (to) {
      query = query.lte('window_date', to);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ anomalies: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


