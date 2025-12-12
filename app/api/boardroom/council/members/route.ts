// Boardroom Brain - Council Members API
// app/api/boardroom/council/members/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDefaultCouncilMembers } from '@/lib/boardroom/council';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const members = await getDefaultCouncilMembers(userId);

    return NextResponse.json({ members });
  } catch (err) {
    console.error('[API] Boardroom council members fetch failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch council members' },
      { status: 500 }
    );
  }
}


