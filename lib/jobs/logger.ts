import { supabaseAdmin } from "@/lib/supabase/admin";

export async function jobLog(args: {
    level: "debug" | "info" | "warn" | "error";
    message: string;
    job_id?: string | null;
    run_id?: string | null;
    user_id_uuid?: string | null;
    owner_user_id?: string | null;
    meta?: any;
}) {
    const sb = supabaseAdmin();
    const { error } = await sb.from("execution_logs").insert({
        level: args.level,
        message: args.message,
        job_id: args.job_id ?? null,
        run_id: args.run_id ?? null,
        user_id_uuid: args.user_id_uuid ?? null,
        owner_user_id: args.owner_user_id ?? null,
        meta: args.meta ?? {},
    });
    if (error) throw error;
}
