import { NextResponse } from 'next/server';
import { logUserEvent, performAction } from '@/lib/now-engine/actions';
import { auth } from '@clerk/nextjs/server';

export async function POST(req: Request) {
    try {
        const { userId } = auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const body = await req.json();
        const { type, payload } = body;
        // type: 'EXECUTE' | 'DEFER' | 'OVERRIDE'

        if (type === 'DEFER') {
            await logUserEvent(userId, 'DEFER_NOW', payload);
        } else if (type === 'EXECUTE') {
            // 1. Perform the side-effect (e.g. close task)
            await performAction(userId, payload);
            // 2. Log it
            await logUserEvent(userId, 'EXECUTED_ACTION', payload);
        } else if (type === 'OVERRIDE') {
            await logUserEvent(userId, 'OVERRIDE_NOW', payload);
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[BRIDGE_ACTION]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
