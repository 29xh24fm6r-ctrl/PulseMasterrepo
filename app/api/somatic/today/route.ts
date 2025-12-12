// Somatic Today API
// app/api/somatic/today/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getSomaticSnapshotForUser } from '@/lib/somatic/v2/context';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const today = new Date();
    const snapshot = await getSomaticSnapshotForUser(userId, today);
    return NextResponse.json({ somatic: snapshot });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


