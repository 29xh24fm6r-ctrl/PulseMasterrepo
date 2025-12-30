import type { SupabaseClient } from "@supabase/supabase-js";
import { handleEmailTriage, type EmailTriageJobPayload } from "./email_triage";
import { questGenerateHandler } from "./quest_generate";
import { followupSuggestHandler } from "./followup_suggest";

export type JobType = "email_triage" | "quest_generate" | "followup_suggest";

export type JobHandlerContext = {
    supabaseAdmin: SupabaseClient;
    now: () => Date;
    logger?: {
        info: (msg: string, meta?: any) => void;
        warn: (msg: string, meta?: any) => void;
        error: (msg: string, meta?: any) => void;
    };
};

export type JobHandler = (payload: any, ctx: JobHandlerContext) => Promise<any>;

export const handlers: Record<string, JobHandler> = {
    email_triage: (payload: EmailTriageJobPayload, ctx) => handleEmailTriage(payload, ctx),
    quest_generate: (payload, ctx) => questGenerateHandler(payload as any, ctx as any),
    followup_suggest: (payload, ctx) => followupSuggestHandler(ctx as any, payload as any),

    // keep placeholders until next wires
    noop: async () => ({ ok: true }),
};
