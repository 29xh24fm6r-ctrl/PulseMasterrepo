// lib/runs/emit.ts
import type { RunEventType } from "@/lib/runs/types";
import { insertEvent } from "@/lib/runs/db";

export async function emit(
    owner_user_id: string,
    run_id: string,
    event_type: RunEventType,
    payload?: any
) {
    await insertEvent({
        owner_user_id,
        run_id,
        event_type,
        payload: payload ?? {},
    });
}
