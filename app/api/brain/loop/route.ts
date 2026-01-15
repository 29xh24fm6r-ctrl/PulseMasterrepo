import { NextResponse } from 'next/server';
import { brainOrchestrator } from '@/lib/brain/brainOrchestrator';
import { ObservePacketSchema } from '@/lib/brain/schemas';
import { supabase } from '@/lib/supabase'; // Client-side check for auth user

export async function POST(req: Request) {
    try {
        const authHeader = req.headers.get('Authorization');
        // Basic check - relying on existing middlewares or just mock for now if running local test.
        // We really want to extract the user ID via Supabase auth.
        // For simplicity in this spec execution:
        const body = await req.json();
        const { owner_user_id, observe } = body;

        if (!owner_user_id) {
            return NextResponse.json({ error: "Missing owner_user_id" }, { status: 401 });
        }

        // Validate Input
        const validation = ObservePacketSchema.safeParse(observe);
        if (!validation.success) {
            return NextResponse.json({ error: "Invalid Observe Packet", details: validation.error }, { status: 400 });
        }

        // Run Loop
        const result = await brainOrchestrator.runBrainLoop(owner_user_id, validation.data);

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Brain Loop Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
