// Conscious Workspace v1 - Focus Manager
// lib/workspace/focus.ts

import { supabaseAdmin } from '@/lib/supabase';
import { WorkspaceFocusState, FocusMode } from './types';
import { getCurrentDestinyAnchor } from '../destiny/anchor';

export async function setWorkspaceFocus(params: {
  userId: string;
  activeTimelineId?: string;
  activeBranchRunId?: string;
  focusMode?: FocusMode;
  focusTags?: string[];
  durationHours?: number;
}): Promise<WorkspaceFocusState> {
  const { userId, activeTimelineId, activeBranchRunId, focusMode = 'normal', focusTags = [], durationHours } = params;

  // If no timeline/branch provided, default to current Destiny anchor
  let finalTimelineId = activeTimelineId;
  if (!finalTimelineId && !activeBranchRunId) {
    const anchor = await getCurrentDestinyAnchor(userId);
    if (anchor) {
      finalTimelineId = anchor.id;
    }
  }

  // Calculate expires_at
  let expiresAt: string | null = null;
  if (durationHours) {
    const expires = new Date();
    expires.setHours(expires.getHours() + durationHours);
    expiresAt = expires.toISOString();
  }

  const { data: focusState, error } = await supabaseAdmin
    .from('workspace_focus_states')
    .insert({
      user_id: userId,
      active_timeline_id: finalTimelineId ?? null,
      active_branch_run_id: activeBranchRunId ?? null,
      focus_mode: focusMode,
      focus_tags: focusTags,
      applied_at: new Date().toISOString(),
      expires_at: expiresAt,
    })
    .select('*')
    .single();

  if (error) throw error;
  return focusState;
}

export async function getCurrentWorkspaceFocus(userId: string): Promise<WorkspaceFocusState | null> {
  const now = new Date().toISOString();

  // Get latest unexpired focus state
  const { data: focusState } = await supabaseAdmin
    .from('workspace_focus_states')
    .select('*')
    .eq('user_id', userId)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('applied_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return focusState ?? null;
}


