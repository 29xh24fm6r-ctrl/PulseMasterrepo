// Latest Conscious Frame API
// app/api/conscious/frame/latest/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getLatestConsciousFrameForUser, getConsciousItemsForFrame } from '@/lib/conscious_workspace/v3/context_read';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const frame = await getLatestConsciousFrameForUser(userId);
    if (!frame) {
      return NextResponse.json({ frame: null, items: [] });
    }

    const items = await getConsciousItemsForFrame(userId, frame.id);

    return NextResponse.json({ frame, items });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


