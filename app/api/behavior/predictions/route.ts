// Behavior Predictions API
// app/api/behavior/predictions/route.ts

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
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const horizon = searchParams.get('horizon');

    const dbUserId = await resolveUserId(userId);

    let query = supabaseAdmin
      .from('behavior_predictions')
      .select('*')
      .eq('user_id', dbUserId)
      .order('prediction_time', { ascending: false });

    if (entityType) {
      query = query.eq('entity_type', entityType);
    }
    if (entityId) {
      const dbEntityId = entityType === 'self' ? dbUserId : entityId;
      query = query.eq('entity_id', dbEntityId);
    }
    if (horizon) {
      query = query.eq('horizon', horizon);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ predictions: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


