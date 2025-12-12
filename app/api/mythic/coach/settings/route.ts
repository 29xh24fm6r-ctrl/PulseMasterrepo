// Mythic Coach - Settings API
// app/api/mythic/coach/settings/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getMythicCoachSettings, updateMythicCoachSettings } from '@/lib/mythic/coach/settings';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await getMythicCoachSettings(userId);
    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[API] Mythic Coach settings fetch failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const settings = await updateMythicCoachSettings(userId, body);

    return NextResponse.json({ settings });
  } catch (err) {
    console.error('[API] Mythic Coach settings update failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update settings' },
      { status: 500 }
    );
  }
}


