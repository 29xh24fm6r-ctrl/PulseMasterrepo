// Social Graph API
// app/api/social/graph/route.ts

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

    const dbUserId = await resolveUserId(userId);

    const [{ data: entities }, { data: edges }, { data: tomProfiles }] = await Promise.all([
      supabaseAdmin
        .from('social_entities')
        .select('*')
        .eq('user_id', dbUserId)
        .order('importance', { ascending: false, nullsLast: true }),
      supabaseAdmin
        .from('social_edges')
        .select('*')
        .eq('user_id', dbUserId),
      supabaseAdmin
        .from('theory_of_mind_profiles')
        .select('*')
        .eq('user_id', dbUserId),
    ]);

    return NextResponse.json({
      entities: entities ?? [],
      edges: edges ?? [],
      tomProfiles: tomProfiles ?? [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
