// Conscious Items API
// app/api/conscious/items/route.ts

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
    const frameId = searchParams.get('frameId');
    const selected = searchParams.get('selected') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50');

    const dbUserId = await resolveUserId(userId);

    let query = supabaseAdmin
      .from('conscious_items')
      .select('*')
      .eq('user_id', dbUserId)
      .order('attention_score', { ascending: false });

    if (frameId) {
      query = query.eq('frame_id', frameId);
    }

    if (selected) {
      query = query.eq('selected', true);
    }

    const { data, error } = await query.limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ items: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


