// Brain Subsystems API
// app/api/brain/subsystems/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserBrainSubsystems, getSubsystemsByRegion, getActiveSubsystems } from '@/lib/brain/registry';
import { BrainRegion } from '@/lib/brain/registry';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const region = searchParams.get('region') as BrainRegion | null;
    const activeOnly = searchParams.get('activeOnly') === 'true';

    let subsystems;

    if (activeOnly) {
      subsystems = await getActiveSubsystems(userId);
    } else if (region) {
      subsystems = await getSubsystemsByRegion(userId, region);
    } else {
      subsystems = await getUserBrainSubsystems(userId);
    }

    return NextResponse.json({ subsystems });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


