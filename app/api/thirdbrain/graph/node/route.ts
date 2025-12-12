// Graph Node API
// app/api/thirdbrain/graph/node/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getNode, getEdgesForNode } from '@/lib/thirdbrain/graph/service';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const nodeId = searchParams.get('id');

    if (!nodeId) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const node = await getNode(nodeId);
    if (!node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    const edges = await getEdgesForNode(userId, nodeId, 'both');

    return NextResponse.json({ node, edges });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}


