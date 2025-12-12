// Device Event Ingestion API
// app/api/somatic/device/ingest/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { ingestRawDeviceEvents } from '@/lib/somatic/v2/ingestion';
import { RawDeviceEvent } from '@/lib/somatic/v2/types';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const events: RawDeviceEvent[] = (body.events || []).map((e: any) => ({
      userId,
      occurredAt: new Date(e.occurredAt),
      source: e.source,
      kind: e.kind,
      metadata: e.metadata,
    }));

    await ingestRawDeviceEvents(userId, events);
    return NextResponse.json({ ok: true, ingested: events.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


