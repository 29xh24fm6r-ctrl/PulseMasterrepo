// Global Sense of Self Mirror v1 - Facets API
// app/api/self-mirror/facets/route.ts

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

    const { data: facets, error } = await supabaseAdminClient
      .from('self_mirror_facets')
      .select('*')
      .eq('user_id', userId)
      .order('key', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ facets: facets ?? [] });
  } catch (err) {
    console.error('[API] Self Mirror facets failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch facets' },
      { status: 500 }
    );
  }
}


