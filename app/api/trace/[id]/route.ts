import { createClient } from "@/lib/supabase/server";
import { requireOpsAuth } from "@/lib/auth/opsAuth"; // Or standard auth

export async function GET(req: Request, { params }: { params: { id: string } }) {
    // 1. Authenticate (User can only read their own traces)
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return new Response("Unauthorized", { status: 401 });
    }

    // 2. Fetch Trace
    const { data, error } = await supabase
        .from("decision_traces")
        .select("explanation_summary, trust_level, outcome, created_at") // Minimized surface
        .eq("id", params.id)
        .eq("user_id", user.id)
        .single();

    if (error || !data) {
        return new Response("Trace not found", { status: 404 });
    }

    // 3. Return (Read-Only)
    return Response.json(data);
}
