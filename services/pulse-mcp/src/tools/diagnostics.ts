import { z } from "zod";
import { getSupabase } from "../supabase.js";
import { assertViewerCanReadTarget } from "../auth.js";

const targetSchema = z.object({
  target_user_id: z.string().min(10),
});

export async function viewerEdgeStatus(input: unknown) {
  const { target_user_id } = targetSchema.parse(input);
  await assertViewerCanReadTarget(target_user_id);
  return { ok: true, target_user_id };
}

export async function health() {
  const { data, error } = await getSupabase()
    .from("pulse_mcp_viewers")
    .select("viewer_user_id")
    .limit(1);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
