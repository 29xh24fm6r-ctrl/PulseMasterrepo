// Somatic Sleep API
// app/api/somatic/sleep/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { recordSleepSample } from '@/lib/somatic/engine';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { date, hours, quality } = body;

    if (!hours || hours < 0 || hours > 24) {
      return NextResponse.json({ error: 'Valid hours (0-24) required' }, { status: 400 });
    }

    const sleepDate = date ? new Date(date) : new Date();

    await recordSleepSample({
      userId,
      date: sleepDate,
      hours,
      quality,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


