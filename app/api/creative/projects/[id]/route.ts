// Creative Cortex v2 - Project Details API
// app/api/creative/projects/[id]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCreativeProject } from '@/lib/creative/projects';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const project = await getCreativeProject(userId, params.id);

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Get sessions and assets for this project
    const { data: sessions } = await supabaseAdmin
      .from('creative_sessions')
      .select('*')
      .eq('project_id', params.id)
      .order('started_at', { ascending: false });

    const { data: assets } = await supabaseAdmin
      .from('creative_assets')
      .select('*')
      .eq('project_id', params.id)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      project,
      sessions: sessions ?? [],
      assets: assets ?? [],
    });
  } catch (err) {
    console.error('[API] Creative project details failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch project' },
      { status: 500 }
    );
  }
}


