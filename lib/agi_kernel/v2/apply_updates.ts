// AGI Kernel v2 - Apply Update Actions
// lib/agi_kernel/v2/apply_updates.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function applyPendingCognitiveUpdatesForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: actions } = await supabaseAdmin
    .from('cognitive_update_actions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('status', 'pending')
    .order('importance', { ascending: false })
    .limit(50);

  for (const action of actions ?? []) {
    const result = await applySingleAction(userId, action);
    await supabaseAdmin
      .from('cognitive_update_actions')
      .update({
        status: result.status,
        status_details: result.details ?? {},
      })
      .eq('id', action.id);
  }
}

async function applySingleAction(
  userId: string,
  action: any
): Promise<{ status: string; details?: any }> {
  // Respect autonomy_level
  if (action.autonomy_level === 'needs_confirmation') {
    // Leave for user/coach to review; could generate a UI notification.
    return { status: 'skipped', details: { reason: 'awaiting_confirmation' } };
  }

  if (action.autonomy_level === 'coach_review') {
    // Route to Confidant/Advisor coach inbox instead of auto-applying.
    return { status: 'skipped', details: { reason: 'awaiting_coach_review' } };
  }

  // auto_safe: execute low-risk action
  try {
    switch (action.target_system) {
      case 'cerebellum':
        // e.g. create/update routine, adjust trigger
        // call cerebellum helper with action.payload
        // TODO: implement cerebellum update logic
        break;

      case 'meta_planner':
        // e.g. adjust planning weights or preferences
        // TODO: implement meta-planner update logic
        break;

      case 'autopilot':
        // tweak autopilot policies
        // TODO: implement autopilot update logic
        break;

      case 'coaches':
        // update coach prompts or configs
        // TODO: implement coach update logic
        break;

      case 'ui':
        // mark insights to surface in dashboard
        // TODO: implement UI update logic
        break;

      default:
        // Unknown system: skip
        return { status: 'skipped', details: { reason: 'unknown_target_system' } };
    }

    return { status: 'applied', details: {} };
  } catch (err: any) {
    return { status: 'skipped', details: { error: String(err?.message ?? err) } };
  }
}


