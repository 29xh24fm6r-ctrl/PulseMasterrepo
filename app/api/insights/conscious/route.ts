// Conscious Insights API
// app/api/insights/conscious/route.ts

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

    const { data, error } = await supabaseAdmin
      .from('conscious_insights')
      .select('*')
      .eq('user_id', dbUserId)
      .is('dismissed_at', null)
      .order('generated_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ insights: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { insightId, action, feedback } = await req.json();

    if (!insightId || !action) {
      return NextResponse.json({ error: 'Missing insightId or action' }, { status: 400 });
    }

    const dbUserId = await resolveUserId(userId);

    const updateData: any = {};
    if (action === 'deliver') {
      updateData.delivered_at = new Date().toISOString();
    } else if (action === 'dismiss') {
      updateData.dismissed_at = new Date().toISOString();
    }

    if (feedback) {
      updateData.user_feedback = feedback;
    }

    const { error } = await supabaseAdmin
      .from('conscious_insights')
      .update(updateData)
      .eq('id', insightId)
      .eq('user_id', dbUserId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


