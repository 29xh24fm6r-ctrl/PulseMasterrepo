// Mind Model API
// app/api/mind/model/route.ts

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
    const entityType = searchParams.get('entityType') || 'self';
    const entityId = searchParams.get('entityId') || userId;

    const dbUserId = await resolveUserId(userId);
    const dbEntityId = entityType === 'self' ? dbUserId : entityId;

    const { data, error } = await supabaseAdmin
      .from('mind_models')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('entity_type', entityType)
      .eq('entity_id', dbEntityId)
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ mindModel: data?.[0] ?? null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


