// Executive Council Mode v1 - Dossier Management
// lib/executive_council/v1/dossier.ts

import { supabaseAdminClient } from '../../supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function createCouncilDecisionDossier(
  userId: string,
  params: {
    sessionId: string;
    decisionLabel: string;
    userChoice: string;
    userNotes?: string;
  }
) {
  const dbUserId = await resolveUserId(userId);

  // fetch session + consensus for context
  const [sessionRes, consensusRes] = await Promise.all([
    supabaseAdminClient
      .from('council_sessions')
      .select('*')
      .eq('id', params.sessionId)
      .eq('user_id', dbUserId)
      .maybeSingle(),
    supabaseAdminClient
      .from('council_consensus')
      .select('*')
      .eq('session_id', params.sessionId)
      .eq('user_id', dbUserId)
      .maybeSingle(),
  ]);

  const session = sessionRes.data ?? null;
  const consensus = consensusRes.data ?? null;

  const { data, error } = await supabaseAdminClient
    .from('council_decision_dossiers')
    .insert({
      user_id: dbUserId,
      session_id: params.sessionId,
      decision_label: params.decisionLabel,
      question: session?.question ?? '',
      context: session?.context ?? {},
      consensus_id: consensus?.id ?? null,
      user_choice: params.userChoice,
      user_notes: params.userNotes ?? null,
      outcome: {},
      learnings: {},
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}

export async function getCouncilDossiersForUser(userId: string, limit: number = 20) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdminClient
    .from('council_decision_dossiers')
    .select('*')
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data ?? [];
}


