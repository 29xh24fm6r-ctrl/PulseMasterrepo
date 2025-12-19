// Creative Cortex v2 - Projects API
// app/api/creative/projects/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createCreativeProject, listCreativeProjects } from '@/lib/creative/projects';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CreativeProjectKind } from '@/lib/creative/types';

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
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const projects = await listCreativeProjects(userId);

    return NextResponse.json({ projects });
  } catch (err) {
    console.error('[API] Creative projects list failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const body = await req.json();
    const { title, description, kind, relatedNodeId, tags } = body;

    if (!title || !kind) {
      return NextResponse.json({ error: 'title and kind required' }, { status: 400 });
    }

    const project = await createCreativeProject({
      userId,
      title,
      description,
      kind: kind as CreativeProjectKind,
      relatedNodeId,
      tags,
    });

    return NextResponse.json({ project });
  } catch (err) {
    console.error('[API] Creative project creation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create project' },
      { status: 500 }
    );
  }
}


