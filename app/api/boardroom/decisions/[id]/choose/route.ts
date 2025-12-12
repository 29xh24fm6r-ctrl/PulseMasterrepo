// Boardroom Brain - Choose Decision API
// app/api/boardroom/decisions/[id]/choose/route.ts

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

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { optionId } = body;

    if (!optionId) {
      return NextResponse.json({ error: 'optionId required' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);
    const decisionId = params.id;

    // Get option label
    const { data: option } = await supabaseAdminClient
      .from('decision_options')
      .select('label')
      .eq('id', optionId)
      .eq('decision_id', decisionId)
      .maybeSingle();

    if (!option) {
      return NextResponse.json({ error: 'Option not found' }, { status: 404 });
    }

    // Update decision
    const { data: decision, error } = await supabaseAdminClient
      .from('decisions')
      .update({
        chosen_option: option.label,
        status: 'decided',
        decided_at: new Date().toISOString(),
      })
      .eq('id', decisionId)
      .eq('user_id', dbUserId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ decision });
  } catch (err) {
    console.error('[API] Boardroom decision choose failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to choose decision' },
      { status: 500 }
    );
  }
}


