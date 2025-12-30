import "server-only";
import { supabaseAdmin } from "@/lib/supabase";

function todayDate(): string {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

export async function bumpScore(args: {
    userIdUuid: string; field:
    "inbox_done_count" | "tasks_done_count" | "followups_done_count" | "replies_sent_count" | "autopilot_actions_count";
    amount?: number;
}) {
    const day = todayDate();
    const amt = args.amount ?? 1;

    // Upsert then increment
    await supabaseAdmin.from("work_scoreboard_days").upsert(
        { user_id_uuid: args.userIdUuid, day },
        { onConflict: "user_id_uuid,day" }
    );

    // Postgres "increment" via rpc would be ideal; V1 uses update with expression not available in supabase-js.
    // So: read then write (acceptable at this scale).
    const cur = await supabaseAdmin
        .from("work_scoreboard_days")
        .select("id," + args.field)
        .eq("user_id_uuid", args.userIdUuid)
        .eq("day", day)
        .single();

    if (cur.error) return;

    const row = cur.data as any;
    const nextVal = (row?.[args.field] ?? 0) + amt;

    await supabaseAdmin
        .from("work_scoreboard_days")
        .update({ [args.field]: nextVal })
        .eq("id", row.id)
        .eq("user_id_uuid", args.userIdUuid);
}
