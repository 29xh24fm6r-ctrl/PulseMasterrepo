import type { SupabaseClient } from "@supabase/supabase-js";

type JobContext = {
    supabaseAdmin: SupabaseClient;
    now: () => Date;
    logger: { info: (...args: any[]) => void; warn: (...args: any[]) => void; error: (...args: any[]) => void };
};

type JobPayload = {
    user_id_uuid: string;
    day?: string;
    count?: number;
};

function isoDayUTC(d: Date) {
    return d.toISOString().slice(0, 10);
}

export async function questGenerateHandler(payload: JobPayload, ctx: JobContext) {
    const { supabaseAdmin, now, logger } = ctx;

    if (!payload?.user_id_uuid) {
        throw new Error("quest_generate: payload.user_id_uuid is required");
    }

    const day = payload.day ?? isoDayUTC(now());
    const desiredCount = Math.max(1, Math.min(payload.count ?? 5, 12));

    // CONFIG based on daily_quests table
    const QUESTS_TABLE = "daily_quests";
    const USER_COL = "user_id"; // Storing user ID as text (auth.uid())
    const DAY_COL = "quest_date";
    const KEY_COL = "quest_key";
    const TITLE_COL = "title";
    const DESC_COL = "description";
    const REWARD_COL = "reward_xp";
    const TARGET_COL = "target";

    logger.info("[quest_generate] start", { user_id_uuid: payload.user_id_uuid, day, desiredCount });

    // 1) Check if quests already exist for that user/day
    // Need to cast UUID to text for user_id column if it implies auth.uid() string
    const userIdText = payload.user_id_uuid;

    const { data: existing, error: existingErr } = await supabaseAdmin
        .from(QUESTS_TABLE)
        .select("id")
        .eq(USER_COL, userIdText)
        .eq(DAY_COL, day)
        .limit(1);

    if (existingErr) {
        logger.error("[quest_generate] existing check failed", existingErr);
        throw existingErr;
    }

    if (existing && existing.length > 0) {
        logger.info("[quest_generate] already exists; no-op", { user_id_uuid: payload.user_id_uuid, day });
        return {
            ok: true,
            action: "noop_existing",
            day,
        };
    }

    // 2) Deterministic baseline quests
    const base = [
        { key: "plan_day", title: "Plan your day (5 min)", description: "Pick the 1–3 outcomes that make today a win." },
        { key: "reach_out", title: "One meaningful reach-out", description: "Message/call one important person or client." },
        { key: "move_body", title: "Move your body (10–20 min)", description: "Walk, stretch, quick lift, anything." },
        { key: "deep_work", title: "Deep work block (25 min)", description: "Single-task on the most leveraged thing." },
        { key: "shutdown", title: "End-of-day shutdown", description: "Capture loose ends and set tomorrow’s first action." },
        { key: "hydration", title: "Hydration check", description: "Drink water now, and again with your next meal." },
        { key: "inbox_lite", title: "Inbox zero-lite", description: "Triage the top 10 items; delete/archive ruthlessly." },
        { key: "gratitude", title: "Gratitude (2 min)", description: "Write down 3 things that went well." },
    ];

    const rows = base.slice(0, desiredCount).map((q) => ({
        [USER_COL]: userIdText,
        [DAY_COL]: day,
        [KEY_COL]: q.key,
        [TITLE_COL]: q.title,
        [DESC_COL]: q.description,
        [TARGET_COL]: 1,
        [REWARD_COL]: 25,
        is_completed: false,
        meta: {},
    }));

    // 3) Insert
    const { error: insErr } = await supabaseAdmin.from(QUESTS_TABLE).insert(rows);

    if (insErr) {
        logger.error("[quest_generate] insert failed", insErr);
        throw insErr;
    }

    logger.info("[quest_generate] inserted", { user_id_uuid: payload.user_id_uuid, day, inserted: rows.length });

    return {
        ok: true,
        action: "inserted",
        day,
        inserted: rows.length,
    };
}
