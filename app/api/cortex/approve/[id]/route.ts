
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client"; // Use server-side auth checking in real app, but client for now
import { getSupabaseAdminRuntimeClient } from "@/lib/runtime/supabase.runtime";
import { executeAction } from "@/lib/cortex/executor";
import { ProposedAction } from "@/lib/cortex/engine";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    try {
        // 1. Validate User (In a real app, check session)
        // const supabase = createClient();
        // const { data: { user } } = await supabase.auth.getUser();
        // if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const actionId = params.id;

        // 2. Fetch Action
        const { data: action, error } = await getSupabaseAdminRuntimeClient()
            .from('proposed_actions')
            .select('*')
            .eq('id', actionId)
            .single();

        if (error || !action) {
            return NextResponse.json({ error: "Action not found" }, { status: 404 });
        }

        if (action.status !== 'pending') {
            return NextResponse.json({ error: "Action already processed logic" }, { status: 400 });
        }

        // 3. Execute
        const success = await executeAction(action as ProposedAction);

        if (!success) {
            return NextResponse.json({ error: "Execution failed" }, { status: 500 });
        }

        return NextResponse.json({ ok: true, id: actionId, status: 'executed' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
