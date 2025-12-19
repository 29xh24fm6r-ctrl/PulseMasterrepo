// Boardroom Brain - Domains API
// app/api/boardroom/domains/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

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

    const { data: domains, error } = await supabaseAdmin
      .from('strategic_domains')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ domains: domains ?? [] });
  } catch (err) {
    console.error('[API] Boardroom domains fetch failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch domains' },
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
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug required' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    const { data: domain, error } = await supabaseAdmin
      .from('strategic_domains')
      .insert({
        user_id: dbUserId,
        name,
        slug,
        description: description ?? null,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ domain });
  } catch (err) {
    console.error('[API] Boardroom domain creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create domain' },
      { status: 500 }
    );
  }
}


