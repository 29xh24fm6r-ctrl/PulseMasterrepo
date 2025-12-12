// Inner Monologue API
// app/api/conscious/monologue/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getRecentInnerMonologueForUser } from '@/lib/conscious_workspace/v3/context_read';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const turns = await getRecentInnerMonologueForUser(userId, limit);

    return NextResponse.json({ turns });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


