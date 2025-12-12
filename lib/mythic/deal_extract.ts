// Mythic Intelligence Layer v1 - Deal Signal Extraction
// lib/mythic/deal_extract.ts

import { supabaseAdminClient } from '../supabase/admin';
import { MythicSignal } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function extractDealSignals(dealId: string, userId: string): Promise<MythicSignal[]> {
  const dbUserId = await resolveUserId(userId);

  // Get deal data
  const { data: deal } = await supabaseAdminClient
    .from('deals')
    .select('*')
    .eq('id', dealId)
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Get related communication/activity
  const [emailsRes, meetingsRes, notesRes] = await Promise.all([
    supabaseAdminClient
      .from('emails')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true }),
    supabaseAdminClient
      .from('meetings')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true }),
    supabaseAdminClient
      .from('deal_notes')
      .select('*')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true }),
  ]);

  const emails = emailsRes.data ?? [];
  const meetings = meetingsRes.data ?? [];
  const notes = notesRes.data ?? [];

  // Extract signals from deal metadata
  const signals: MythicSignal[] = [];

  // Financial signals
  if (deal.value) {
    signals.push({
      type: 'financial_scale',
      level: deal.value > 1000000 ? 0.9 : deal.value > 100000 ? 0.7 : 0.5,
      source: 'deal_metadata',
      metadata: { value: deal.value },
    });
  }

  // Speed signals
  const daysSinceStart = deal.created_at
    ? Math.floor((new Date().getTime() - new Date(deal.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  if (daysSinceStart !== null) {
    signals.push({
      type: 'speed',
      level: daysSinceStart < 30 ? 0.9 : daysSinceStart < 90 ? 0.6 : 0.3,
      source: 'timeline',
      metadata: { days: daysSinceStart },
    });
  }

  // Communication signals
  const emailCount = emails.length;
  const meetingCount = meetings.length;
  
  if (emailCount > 20) {
    signals.push({
      type: 'bureaucracy',
      level: 0.8,
      source: 'communication_volume',
      metadata: { email_count: emailCount },
    });
  }

  if (meetingCount > 5) {
    signals.push({
      type: 'relationship_focus',
      level: 0.7,
      source: 'meeting_volume',
      metadata: { meeting_count: meetingCount },
    });
  }

  // Status signals
  if (deal.status === 'negotiating' || deal.status === 'in_progress') {
    signals.push({
      type: 'active_engagement',
      level: 0.8,
      source: 'deal_status',
      metadata: { status: deal.status },
    });
  }

  // Use LLM to extract more nuanced signals from communication
  if (emails.length > 0 || notes.length > 0) {
    const communicationText = [
      ...emails.slice(0, 5).map((e: any) => e.subject || e.body?.substring(0, 200)),
      ...notes.slice(0, 3).map((n: any) => n.content?.substring(0, 200)),
    ].filter(Boolean).join('\n\n');

    // For now, return basic signals
    // In production, you could use LLM to extract: aggression, vision_pitch, risk_aversion, etc.
  }

  return signals;
}


