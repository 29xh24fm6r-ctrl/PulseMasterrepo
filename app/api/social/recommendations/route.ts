// Social Recommendations API
// app/api/social/recommendations/route.ts

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
    const status = searchParams.get('status') || 'pending';
    const limit = parseInt(searchParams.get('limit') || '20');

    const dbUserId = await resolveUserId(userId);

    const { data, error } = await supabaseAdmin
      .from('social_recommendations')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('status', status)
      .order('priority', { ascending: false })
      .order('recommended_for_date', { ascending: true })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ recommendations: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { recommendationId, status, feedback } = body;

    if (!recommendationId || !status) {
      return NextResponse.json({ error: 'Missing recommendationId or status' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    const updatePayload: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'done') {
      updatePayload.completed_at = new Date().toISOString();
    }

    if (feedback) {
      updatePayload.user_feedback = feedback;
    }

    const { error } = await supabaseAdmin
      .from('social_recommendations')
      .update(updatePayload)
      .eq('id', recommendationId)
      .eq('user_id', dbUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


