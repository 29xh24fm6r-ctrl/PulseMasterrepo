// Boardroom Brain - Decisions API
// app/api/boardroom/decisions/route.ts

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

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, domainId, objectiveId, options, context, importance } = body;

    if (!title || !options || options.length === 0) {
      return NextResponse.json({ error: 'title and options required' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    // Create decision
    const { data: decision, error: decisionError } = await supabaseAdmin
      .from('decisions')
      .insert({
        user_id: dbUserId,
        domain_id: domainId ?? null,
        objective_id: objectiveId ?? null,
        title,
        description: description ?? null,
        context: context ?? {},
        importance: importance ?? 3,
        status: 'open',
      })
      .select('*')
      .single();

    if (decisionError) throw decisionError;

    // Create options
    const optionRows = options.map((opt: any, idx: number) => ({
      decision_id: decision.id,
      label: opt.label,
      description: opt.description ?? null,
      is_default: idx === 0,
    }));

    const { data: createdOptions, error: optionsError } = await supabaseAdmin
      .from('decision_options')
      .insert(optionRows)
      .select('*');

    if (optionsError) throw optionsError;

    return NextResponse.json({
      decision,
      options: createdOptions ?? [],
    });
  } catch (err) {
    console.error('[API] Boardroom decision creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create decision' },
      { status: 500 }
    );
  }
}


