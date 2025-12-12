// Ethnographic Intelligence - Signal Extraction
// lib/ethnography/signals.ts

import { supabaseAdmin } from '@/lib/supabase';
import { CulturalSignalInput } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function recordCulturalSignal(
  userId: string,
  input: CulturalSignalInput
): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('cultural_signals')
    .insert({
      user_id: dbUserId,
      domain: input.domain,
      source: input.source,
      content: input.content ?? {},
      weight: input.weight ?? 0.5,
    })
    .select('id');

  if (error) throw error;
  return data?.[0]?.id as string;
}

// Helper to extract signals from common patterns
export async function extractSignalsFromEmail(
  userId: string,
  email: { from: string; subject: string; body: string; metadata?: any }
) {
  // Heuristic: if from boss/leader, extract leadership culture signals
  // If from team member, extract team culture signals
  // If contains approval/rejection language, extract approval dynamics
  // If contains risk language, extract risk tolerance

  const signals: CulturalSignalInput[] = [];

  // Simple heuristics - in production, use LLM for more sophisticated extraction
  const lowerBody = email.body.toLowerCase();
  const lowerSubject = email.subject.toLowerCase();

  // Approval/rejection patterns
  if (lowerBody.includes('approve') || lowerBody.includes('approved')) {
    signals.push({
      domain: 'leader',
      source: 'email',
      content: {
        pattern: 'approval_language',
        context: email.subject,
        extracted: 'Approval process observed',
      },
      weight: 0.7,
    });
  }

  if (lowerBody.includes('need more') || lowerBody.includes('missing')) {
    signals.push({
      domain: 'institution',
      source: 'email',
      content: {
        pattern: 'detail_requirement',
        context: email.subject,
        extracted: 'High detail expectations',
      },
      weight: 0.8,
    });
  }

  // Risk language
  if (lowerBody.includes('risk') || lowerBody.includes('concern')) {
    signals.push({
      domain: 'institution',
      source: 'email',
      content: {
        pattern: 'risk_awareness',
        context: email.subject,
        extracted: 'Risk-conscious culture',
      },
      weight: 0.6,
    });
  }

  // Record all signals
  for (const signal of signals) {
    await recordCulturalSignal(userId, signal);
  }

  return signals.length;
}

// Helper to extract signals from meeting notes
export async function extractSignalsFromMeeting(
  userId: string,
  meeting: { title: string; notes: string; participants?: string[]; metadata?: any }
) {
  const signals: CulturalSignalInput[] = [];

  const lowerNotes = meeting.notes.toLowerCase();

  // Decision-making patterns
  if (lowerNotes.includes('decided') || lowerNotes.includes('agreed')) {
    signals.push({
      domain: 'team',
      source: 'meeting',
      content: {
        pattern: 'decision_making',
        context: meeting.title,
        extracted: 'Decision pattern observed',
      },
      weight: 0.7,
    });
  }

  // Conflict patterns
  if (lowerNotes.includes('disagreed') || lowerNotes.includes('pushback')) {
    signals.push({
      domain: 'team',
      source: 'meeting',
      content: {
        pattern: 'conflict_style',
        context: meeting.title,
        extracted: 'Conflict handling observed',
      },
      weight: 0.8,
    });
  }

  // Record all signals
  for (const signal of signals) {
    await recordCulturalSignal(userId, signal);
  }

  return signals.length;
}


