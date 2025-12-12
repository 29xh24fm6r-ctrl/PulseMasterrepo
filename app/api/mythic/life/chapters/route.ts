// Mythic Intelligence - Life Chapters API
// app/api/mythic/life/chapters/route.ts

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

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dbUserId = await resolveUserId(userId);

    const { data: chapters, error } = await supabaseAdminClient
      .from('life_chapters')
      .select('*, mythic_archetypes(*)')
      .eq('user_id', dbUserId)
      .order('timeframe_start', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ chapters: chapters ?? [] });
  } catch (err) {
    console.error('[API] Mythic chapters fetch failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch chapters' },
      { status: 500 }
    );
  }
}


