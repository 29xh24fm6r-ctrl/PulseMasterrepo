// Master Brain Registry + Diagnostics v1 - Registry
// lib/masterbrain/registry.ts

import { supabaseAdminClient } from '../supabase/admin';
import { SystemModule, SystemCapability } from './types';

const CORE_MODULES = [
  { key: 'mythic_intelligence', name: 'Mythic Intelligence Layer', description: 'Life chapters, deal archetypes, story sessions', category: 'narrative' },
  { key: 'mythic_coach', name: 'Mythic Coach Engine', description: 'Archetypal, story-driven coaching', category: 'coach' },
  { key: 'boardroom_brain', name: 'Boardroom Brain', description: 'Strategic Mind + Executive Council + Decision Theater', category: 'strategy' },
  { key: 'autopilot', name: 'Autopilot', description: 'Automated task execution and workflows', category: 'core' },
  { key: 'life_simulation', name: 'Life Simulation Engine', description: 'Multi-timeline scenario simulation', category: 'simulation' },
  { key: 'third_brain', name: 'Third Brain Graph', description: 'Living knowledge graph of all user data', category: 'data' },
  { key: 'emotion_os', name: 'Emotion OS', description: 'Emotional state tracking and resonance', category: 'core' },
  { key: 'identity_engine', name: 'Identity Engine', description: 'Core identity, roles, and values', category: 'core' },
  { key: 'weekly_planner', name: 'Weekly Planner', description: 'Weekly planning and review system', category: 'coach' },
  { key: 'relationships_engine', name: 'Relationships Engine', description: 'Social graph and relationship intelligence', category: 'data' },
  { key: 'finance_overview', name: 'Finance Overview', description: 'Financial state and forecasting', category: 'data' },
  { key: 'voice_layer', name: 'Voice Layer', description: 'Voice profiles and TTS integration', category: 'integration' },
  { key: 'conscious_workspace', name: 'Conscious Workspace', description: 'Global awareness and attention system', category: 'core' },
  { key: 'somatic_loop', name: 'Somatic Loop', description: 'Energy, fatigue, and body intelligence', category: 'data' },
  { key: 'narrative_intelligence', name: 'Narrative Intelligence', description: 'Life chapters, themes, and story arcs', category: 'narrative' },
];

const CAPABILITIES = [
  // Mythic Intelligence
  { moduleKey: 'mythic_intelligence', key: 'mythic.story_sessions', name: 'Story Sessions', api_route: '/api/mythic/session/start' },
  { moduleKey: 'mythic_intelligence', key: 'mythic.deal_archetypes', name: 'Deal Archetype Lens', api_route: '/api/mythic/deal/run' },
  { moduleKey: 'mythic_intelligence', key: 'mythic.life_chapters', name: 'Life Chapters', api_route: '/api/mythic/life/chapters' },
  // Mythic Coach
  { moduleKey: 'mythic_coach', key: 'mythic_coach.message', name: 'Mythic Coach Message', api_route: '/api/mythic/coach/message' },
  { moduleKey: 'mythic_coach', key: 'mythic_coach.daily_ritual', name: 'Daily Ritual', api_route: '/api/mythic/coach/daily-ritual' },
  // Boardroom Brain
  { moduleKey: 'boardroom_brain', key: 'boardroom.decisions', name: 'Decision Review', api_route: '/api/boardroom/decisions/[id]/review' },
  { moduleKey: 'boardroom_brain', key: 'boardroom.strategic_plans', name: 'Strategic Plans', api_route: '/api/boardroom/plan/generate' },
  // Autopilot
  { moduleKey: 'autopilot', key: 'autopilot.run', name: 'Autopilot Run', api_route: '/api/autopilot/run' },
  // Life Simulation
  { moduleKey: 'life_simulation', key: 'simulation.timelines', name: 'Timeline Simulation', api_route: '/api/simulation/timelines' },
  // Weekly Planner
  { moduleKey: 'weekly_planner', key: 'weekly_planner.generate', name: 'Weekly Plan Generation', api_route: '/api/planner/weekly/generate' },
];

export async function ensureSystemModulesSeeded(): Promise<void> {
  for (const module of CORE_MODULES) {
    const { data: existing } = await supabaseAdminClient
      .from('system_modules')
      .select('*')
      .eq('key', module.key)
      .maybeSingle();

    if (!existing) {
      await supabaseAdminClient
        .from('system_modules')
        .insert({
          key: module.key,
          name: module.name,
          description: module.description,
          category: module.category,
          owner: 'system',
        });
    }
  }

  // Seed capabilities
  for (const cap of CAPABILITIES) {
    const { data: module } = await supabaseAdminClient
      .from('system_modules')
      .select('id')
      .eq('key', cap.moduleKey)
      .maybeSingle();

    if (!module) continue;

    const { data: existing } = await supabaseAdminClient
      .from('system_capabilities')
      .select('*')
      .eq('module_id', module.id)
      .eq('key', cap.key)
      .maybeSingle();

    if (!existing) {
      await supabaseAdminClient
        .from('system_capabilities')
        .insert({
          module_id: module.id,
          key: cap.key,
          name: cap.name,
          api_route: cap.api_route,
        });
    }
  }
}

export async function listSystemModules(): Promise<SystemModule[]> {
  await ensureSystemModulesSeeded();

  const { data: modules } = await supabaseAdminClient
    .from('system_modules')
    .select('*')
    .order('category', { ascending: true })
    .order('name', { ascending: true });

  return modules ?? [];
}

export async function listSystemCapabilities(): Promise<SystemCapability[]> {
  await ensureSystemModulesSeeded();

  const { data: capabilities } = await supabaseAdminClient
    .from('system_capabilities')
    .select('*')
    .order('module_id', { ascending: true })
    .order('key', { ascending: true });

  return capabilities ?? [];
}

export async function getModuleByKey(key: string): Promise<SystemModule | null> {
  await ensureSystemModulesSeeded();

  const { data: module } = await supabaseAdminClient
    .from('system_modules')
    .select('*')
    .eq('key', key)
    .maybeSingle();

  return module;
}


