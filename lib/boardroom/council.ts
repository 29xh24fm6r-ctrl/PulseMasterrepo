// Boardroom Brain v1 - Executive Council Engine
// lib/boardroom/council.ts

import { supabaseAdminClient } from '../supabase/admin';
import { callAIJson, callAI } from '@/lib/ai/call';
import { ExecutiveCouncilMember, ExecutiveCouncilVote } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdminClient
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const DEFAULT_COUNCIL_MEMBERS = [
  {
    name: 'CFO',
    slug: 'cfo',
    description: 'Hardline about cash flow & downside. Focuses on financial sustainability.',
    role: 'finance',
    archetype_tags: ['stoic', 'hardliner'],
  },
  {
    name: 'Chief Risk Officer',
    slug: 'risk_officer',
    description: 'Focused on tail risk, reputation, regulatory. Protects against worst-case scenarios.',
    role: 'risk',
    archetype_tags: ['cautious', 'protective'],
  },
  {
    name: 'Strategic General',
    slug: 'strategic_general',
    description: 'Big-picture competitive advantage. Long-term positioning and market strategy.',
    role: 'strategy',
    archetype_tags: ['visionary', 'strategic'],
  },
  {
    name: 'Human/Family Advocate',
    slug: 'human_advocate',
    description: 'Impact on stress, relationships, energy. Protects personal well-being.',
    role: 'wellbeing',
    archetype_tags: ['empathetic', 'balanced'],
  },
  {
    name: 'Future Self (3-5 years)',
    slug: 'future_self',
    description: 'Long-term compounding & identity. What will matter in 3-5 years?',
    role: 'future',
    archetype_tags: ['wise', 'long-term'],
  },
];

export async function ensureDefaultCouncilSeeded(userId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  for (const member of DEFAULT_COUNCIL_MEMBERS) {
    const { data: existing } = await supabaseAdminClient
      .from('executive_council_members')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('slug', member.slug)
      .maybeSingle();

    if (!existing) {
      await supabaseAdminClient
        .from('executive_council_members')
        .insert({
          user_id: dbUserId,
          name: member.name,
          slug: member.slug,
          description: member.description,
          role: member.role,
          archetype_tags: member.archetype_tags,
          is_system_default: true,
          is_active: true,
        });
    }
  }
}

export async function getDefaultCouncilMembers(userId: string): Promise<ExecutiveCouncilMember[]> {
  const dbUserId = await resolveUserId(userId);

  await ensureDefaultCouncilSeeded(userId);

  const { data: members } = await supabaseAdminClient
    .from('executive_council_members')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });

  return members ?? [];
}

export async function runCouncilVote(params: {
  userId: string;
  decisionId: string;
}): Promise<{
  votes: ExecutiveCouncilVote[];
  aggregateSummary: string;
}> {
  const dbUserId = await resolveUserId(params.userId);

  // Get decision and options
  const [decisionRes, optionsRes, membersRes] = await Promise.all([
    supabaseAdminClient
      .from('decisions')
      .select('*, strategic_domains(*), strategic_objectives(*)')
      .eq('id', params.decisionId)
      .eq('user_id', dbUserId)
      .maybeSingle(),
    supabaseAdminClient
      .from('decision_options')
      .select('*')
      .eq('decision_id', params.decisionId)
      .order('created_at', { ascending: true }),
    getDefaultCouncilMembers(params.userId),
  ]);

  const decision = decisionRes.data;
  const options = optionsRes.data ?? [];
  const members = membersRes;

  if (!decision) throw new Error('Decision not found');
  if (options.length === 0) throw new Error('No options found');
  if (members.length === 0) throw new Error('No council members found');

  // Get context (deal, finances, mythic profile)
  const [dealRes, financeRes, mythicRes] = await Promise.all([
    decision.context?.dealId
      ? supabaseAdminClient
          .from('deals')
          .select('*')
          .eq('id', decision.context.dealId)
          .eq('user_id', dbUserId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabaseAdminClient
      .from('financial_state_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdminClient
      .from('user_mythic_profile')
      .select('*')
      .eq('user_id', dbUserId)
      .maybeSingle(),
  ]);

  const deal = dealRes.data;
  const finance = financeRes.data;
  const mythic = mythicRes.data;

  // Collect votes from each member
  const votes: ExecutiveCouncilVote[] = [];

  for (const member of members) {
    const memberPrompt = `You are ${member.name}, ${member.description}

Your role: ${member.role}
Your archetype: ${member.archetype_tags?.join(', ')}

Decision: ${decision.title}
${decision.description ? `\n${decision.description}` : ''}

Options:
${options.map((opt: any, idx: number) => `${idx + 1}. ${opt.label}${opt.description ? ` - ${opt.description}` : ''}`).join('\n')}

Context:
${deal ? `Deal: ${JSON.stringify(deal, null, 2)}` : ''}
${finance ? `Financial State: ${JSON.stringify(finance, null, 2)}` : ''}
${mythic ? `Current Life Chapter: ${mythic.current_chapter_id}` : ''}

As ${member.name}, which option do you recommend and why?`;

    const result = await callAIJson<{
      chosen_option_label: string;
      rationale: string;
      concerns: string[];
      confidence: number;
    }>({
      userId: params.userId,
      feature: 'executive_council_vote',
      systemPrompt: `You are ${member.name} in an executive council. Provide your vote on a decision.

Return JSON with:
- chosen_option_label: The label of the option you choose
- rationale: Your reasoning (2-3 sentences)
- concerns: Array of 1-3 concerns
- confidence: 0-1 how confident you are`,
      userPrompt: memberPrompt,
      maxTokens: 1000,
      temperature: 0.7,
    });

    if (!result.success || !result.data) {
      console.error(`Failed to get vote from ${member.name}`);
      continue;
    }

    const { chosen_option_label, rationale, concerns, confidence } = result.data;

    // Find matching option
    const chosenOption = options.find((opt: any) => opt.label === chosen_option_label) ?? options[0];

    // Insert vote
    const { data: vote, error } = await supabaseAdminClient
      .from('executive_council_votes')
      .upsert({
        decision_id: params.decisionId,
        member_id: member.id,
        option_id: chosenOption.id,
        rationale: rationale,
        concerns: concerns ?? [],
        confidence: confidence ?? 0.5,
      }, {
        onConflict: 'decision_id,member_id',
      })
      .select('*')
      .single();

    if (error) {
      console.error(`Failed to save vote from ${member.name}`, error);
      continue;
    }

    votes.push(vote);
  }

  // Generate aggregate summary
  const voteCounts = new Map<string, number>();
  votes.forEach((v) => {
    const count = voteCounts.get(v.option_id) ?? 0;
    voteCounts.set(v.option_id, count + 1);
  });

  const majorityOptionId = Array.from(voteCounts.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  const majorityOption = options.find((opt: any) => opt.id === majorityOptionId);

  const summaryResult = await callAI({
    userId: params.userId,
    feature: 'council_aggregate_summary',
    systemPrompt: 'Summarize executive council votes into a concise aggregate summary.',
    userPrompt: `Votes:\n${JSON.stringify(votes.map((v) => ({ member: members.find((m) => m.id === v.member_id)?.name, option: options.find((o) => o.id === v.option_id)?.label, rationale: v.rationale, confidence: v.confidence })), null, 2))}\n\nMajority: ${majorityOption?.label}`,
    maxTokens: 500,
    temperature: 0.7,
  });

  const aggregateSummary = summaryResult.success && summaryResult.text
    ? summaryResult.text
    : `Majority recommendation: ${majorityOption?.label ?? 'No clear majority'}`;

  return { votes, aggregateSummary };
}

