// Life Canon - Get Event API
// app/api/life-canon/event/[id]/route.ts

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
    const eventId = params.id;

    const { data: event, error } = await supabaseAdmin
      .from('canon_events')
      .select('*')
      .eq('id', eventId)
      .eq('user_id', dbUserId)
      .maybeSingle();

    if (error) throw error;
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    return NextResponse.json({ event });
  } catch (err) {
    console.error('[API] Get Life Canon event failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch event' },
      { status: 500 }
    );
  }
}


