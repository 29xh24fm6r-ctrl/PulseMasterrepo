// Pulse Brain Registry - Subsystems & Regions
// lib/brain/registry.ts

import { supabaseAdmin } from '@/lib/supabase';

export type BrainRegion =
  | 'brainstem'
  | 'hippocampus'
  | 'third_brain'
  | 'limbic'
  | 'neocortex'
  | 'cerebellum'
  | 'prefrontal'
  | 'agi_kernel'
  | 'social'
  | 'ethnographic'
  | 'workspace';

export type BrainSubsystemKey =
  | 'global_workspace'
  | 'emotional_resonance'
  | 'somatic_loop'
  | 'narrative_intelligence'
  | 'desire_model'
  | 'theory_of_mind'
  | 'creative_cortex'
  | 'ethical_compass'
  | 'meta_learning'
  | 'behavior_prediction'
  | 'social_graph_intel'
  | 'ethnographic_intel';

export type SubsystemStatus = 'planned' | 'partial' | 'active' | 'degraded';

export interface BrainSubsystemDefinition {
  key: BrainSubsystemKey;
  name: string;
  region: BrainRegion;
  description: string;
  // Which other subsystems/regions it depends on
  dependencies?: BrainSubsystemKey[];
}

export const BRAIN_SUBSYSTEMS: BrainSubsystemDefinition[] = [
  {
    key: 'global_workspace',
    name: 'Global Conscious Workspace',
    region: 'workspace',
    description:
      'Tracks current focus, conflicts, and active threads of thought across hours and days.',
    dependencies: ['behavior_prediction', 'narrative_intelligence'],
  },
  {
    key: 'emotional_resonance',
    name: 'Emotional Mirroring & Resonance',
    region: 'limbic',
    description:
      'Adapts tone, pacing, and coach persona to match user emotional state.',
  },
  {
    key: 'somatic_loop',
    name: 'Somatic Loop',
    region: 'limbic',
    description:
      'Models energy, fatigue, and circadian rhythms from sleep, schedule, and activity signals.',
  },
  {
    key: 'narrative_intelligence',
    name: 'Narrative Intelligence',
    region: 'hippocampus',
    description:
      'Tracks life chapters, themes, and identity arcs over time.',
  },
  {
    key: 'desire_model',
    name: 'Desire Modeling',
    region: 'limbic',
    description:
      'Learns true preferences, reward patterns, and avoidance triggers.',
  },
  {
    key: 'theory_of_mind',
    name: 'Theory of Mind',
    region: 'social',
    description:
      'Builds mental models of key people to anticipate reactions and needs.',
  },
  {
    key: 'creative_cortex',
    name: 'Creative Cortex',
    region: 'neocortex',
    description:
      'Generates new ideas, workflows, and strategies using patterns and LLMs.',
  },
  {
    key: 'ethical_compass',
    name: 'Ethical Compass',
    region: 'prefrontal',
    description:
      'Keeps decisions aligned with user values and system constraints.',
  },
  {
    key: 'meta_learning',
    name: 'Compression & Abstraction Engine',
    region: 'hippocampus',
    description:
      'Converts raw experience into heuristics, lessons, and reusable knowledge.',
  },
  {
    key: 'behavior_prediction',
    name: 'Behavioral Prediction',
    region: 'neocortex',
    description:
      'Forecasts likely behaviors and risks to preempt problems.',
  },
  {
    key: 'social_graph_intel',
    name: 'Social Graph Intelligence',
    region: 'social',
    description:
      'Maintains a live map of relationship health, tension, and opportunities.',
  },
  {
    key: 'ethnographic_intel',
    name: 'Ethnographic Intelligence',
    region: 'ethnographic',
    description:
      'Understands the cultures, norms, and contexts the user operates in.',
  },
];

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

/**
 * Ensure all brain subsystems are registered for a user
 */
export async function ensureBrainSubsystemsForUser(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const rows = BRAIN_SUBSYSTEMS.map((s) => ({
    user_id: dbUserId,
    key: s.key,
    name: s.name,
    region: s.region,
    description: s.description,
    status: 'planned' as SubsystemStatus,
    version: 'v1',
  }));

  const { error } = await supabaseAdmin
    .from('brain_subsystems')
    .upsert(rows, { onConflict: 'user_id,key' });

  if (error) {
    console.error('[Brain Registry] ensureBrainSubsystemsForUser error', error);
    throw error;
  }
}

/**
 * Update subsystem status
 */
export async function updateSubsystemStatus(
  userId: string,
  key: BrainSubsystemKey,
  status: SubsystemStatus,
  version?: string,
  config?: any,
  metrics?: any,
) {
  const dbUserId = await resolveUserId(userId);

  const update: any = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (version) {
    update.version = version;
  }
  if (config !== undefined) {
    update.config = config;
  }
  if (metrics !== undefined) {
    update.metrics = metrics;
  }

  const { error } = await supabaseAdmin
    .from('brain_subsystems')
    .update(update)
    .eq('user_id', dbUserId)
    .eq('key', key);

  if (error) {
    console.error('[Brain Registry] updateSubsystemStatus error', error);
    throw error;
  }
}

/**
 * Get all subsystems for a user
 */
export async function getUserBrainSubsystems(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('brain_subsystems')
    .select('*')
    .eq('user_id', dbUserId)
    .order('region', { ascending: true })
    .order('status', { ascending: true });

  if (error) {
    console.error('[Brain Registry] getUserBrainSubsystems error', error);
    throw error;
  }

  return data || [];
}

/**
 * Get subsystems by region
 */
export async function getSubsystemsByRegion(userId: string, region: BrainRegion) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('brain_subsystems')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('region', region)
    .order('status', { ascending: true });

  if (error) {
    console.error('[Brain Registry] getSubsystemsByRegion error', error);
    throw error;
  }

  return data || [];
}

/**
 * Get active subsystems (status = 'active' or 'partial')
 */
export async function getActiveSubsystems(userId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('brain_subsystems')
    .select('*')
    .eq('user_id', dbUserId)
    .in('status', ['active', 'partial'])
    .order('region', { ascending: true });

  if (error) {
    console.error('[Brain Registry] getActiveSubsystems error', error);
    throw error;
  }

  return data || [];
}

/**
 * Get subsystem definition by key
 */
export function getSubsystemDefinition(key: BrainSubsystemKey): BrainSubsystemDefinition | undefined {
  return BRAIN_SUBSYSTEMS.find(s => s.key === key);
}

/**
 * Get all subsystems in a region
 */
export function getSubsystemsInRegion(region: BrainRegion): BrainSubsystemDefinition[] {
  return BRAIN_SUBSYSTEMS.filter(s => s.region === region);
}


