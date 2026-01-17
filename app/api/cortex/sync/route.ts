
import { NextResponse } from "next/server";
import { CortexEngine, Signal } from "@/lib/cortex/engine";
import { executeAction } from "@/lib/cortex/executor";
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";

export async function POST(req: Request) {
    try {
        const supabase = getSupabaseAdminRuntimeClient();
        const { userId, mockSignals } = await req.json(); // Allow mocking for dev

        if (!userId) {
            return NextResponse.json({ error: "UserId required" }, { status: 400 });
        }

        const engine = new CortexEngine(userId);
        let signals: Signal[] = mockSignals || [];

        // If no mock signals, fetch real ones (e.g. from unread_emails table)
        if (signals.length === 0) {
            // TODO: Fetch from DB
            // const { data } = await supabase.from('inbox_queue').select('*').eq('status', 'pending');
            // signals = transformToSignals(data);
            console.log("No mock signals provided. Running in idle mode.");
        }

        // RUN THE BRAIN
        const proposedActions = await engine.process(signals);

        // EXECUTE OR QUEUE
        for (const action of proposedActions) {
            if (action.autoExecute) {
                console.log(`⚡ AUTO-EXECUTING: ${action.title}`);
                await executeAction(action);
            } else {
                console.log(`✋ QUEUEING FOR APPROVAL: ${action.title}`);

                await supabase.from('proposed_actions').insert({
                    id: action.id,
                    user_id: userId,
                    title: action.title,
                    reasoning: action.reasoning,
                    type: action.type,
                    payload: action.payload,
                    confidence: action.confidence,
                    status: 'pending'
                });
            }
        }

        return NextResponse.json({
            ok: true,
            processed: signals.length,
            actionsGenerated: proposedActions.length,
            actions: proposedActions
        });

    } catch (error: any) {
        console.error("Cortex Sync Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
