// Mythic Intelligence Layer v1 - Deal Archetype Classification
// lib/mythic/deal_classify.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { extractDealSignals } from './deal_extract';
import { DealArchetypeRun } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function classifyDealArchetype(params: {
  userId: string;
  dealId: string;
}): Promise<DealArchetypeRun> {
  const dbUserId = await resolveUserId(params.userId);

  // Extract signals
  const signals = await extractDealSignals(params.dealId, params.userId);

  // Get deal info
  const { data: deal } = await supabaseAdmin
    .from('deals')
    .select('*')
    .eq('id', params.dealId)
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (!deal) {
    throw new Error('Deal not found');
  }

  // Get available deal archetypes
  const { data: archetypes } = await supabaseAdmin
    .from('mythic_archetypes')
    .select('*')
    .eq('kind', 'deal');

  // Use LLM to classify
  const result = await callAIJson<{
    archetype_slug: string;
    confidence: number;
    signals_used: string[];
    recommended_strategy: string;
  }>({
    userId: params.userId,
    feature: 'deal_archetype_classify',
    systemPrompt: `You are a Deal Archetype Classifier. Based on signals from a deal, classify it into one of these archetypes:

- hunter: Aggressive, fast-moving, focused on closing
- fortress: Defensive, risk-averse, process-heavy
- trickster: Unpredictable, boundary-testing, creative
- visionary: Big-picture, future-focused, relationship-driven
- leviathan: Large, powerful, slow-moving, immense resources

Return JSON with:
- archetype_slug: One of the above
- confidence: 0-1
- signals_used: Array of signal types that influenced the classification
- recommended_strategy: A brief strategy recommendation for dealing with this archetype`,
    userPrompt: `Deal Info:\n${JSON.stringify({ name: deal.name, value: deal.value, status: deal.status }, null, 2)}\n\nSignals:\n${JSON.stringify(signals, null, 2)}\n\nAvailable Archetypes:\n${JSON.stringify(archetypes?.map((a: any) => ({ slug: a.slug, description: a.description })), null, 2)}`,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    throw new Error(`Failed to classify deal archetype: ${result.error}`);
  }

  const { archetype_slug, confidence, signals_used, recommended_strategy } = result.data;

  // Find archetype ID
  const archetype = archetypes?.find((a: any) => a.slug === archetype_slug);
  if (!archetype) {
    throw new Error(`Archetype not found: ${archetype_slug}`);
  }

  // Insert or update run
  const runData = {
    user_id: dbUserId,
    deal_id: params.dealId,
    archetype_id: archetype.id,
    confidence: confidence,
    signals: { signals, signals_used },
    recommended_strategy: recommended_strategy,
  };

  const { data: existing } = await supabaseAdmin
    .from('deal_archetype_runs')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('deal_id', params.dealId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let run: DealArchetypeRun;
  if (existing) {
    const { data, error } = await supabaseAdmin
      .from('deal_archetype_runs')
      .update(runData)
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    run = data;
  } else {
    const { data, error } = await supabaseAdmin
      .from('deal_archetype_runs')
      .insert(runData)
      .select('*')
      .single();

    if (error) throw error;
    run = data;
  }

  return run;
}


