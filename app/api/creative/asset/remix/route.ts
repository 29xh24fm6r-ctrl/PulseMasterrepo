// Creative Cortex v2 - Asset Remix API
// app/api/creative/asset/remix/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { remixCreativeAsset } from '@/lib/creative/remix';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CreativeAssetKind } from '@/lib/creative/types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = await resolveUserId(clerkId);

    const body = await req.json();
    const { assetId, targetKind, styleProfileId } = body;

    if (!assetId || !targetKind) {
      return NextResponse.json({ error: 'assetId and targetKind required' }, { status: 400 });
    }

    const remixedAsset = await remixCreativeAsset({
      userId,
      assetId,
      targetKind: targetKind as CreativeAssetKind,
      styleProfileId,
    });

    return NextResponse.json({ asset: remixedAsset });
  } catch (err) {
    console.error('[API] Creative asset remix failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to remix asset' },
      { status: 500 }
    );
  }
}


