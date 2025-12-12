-- Master Brain Registry v1 & Brain Diagnostics v1
-- supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql

-- ============================================
-- BRAIN SUBSYSTEMS (Static Registry)
-- ============================================

CREATE TABLE IF NOT EXISTS public.brain_subsystems (
  id text PRIMARY KEY,                 -- e.g. 'agi_kernel', 'neocortex_v1', 'conscious_workspace_v3'
  group_name text NOT NULL,           -- 'core', 'memory', 'emotion', 'planning', 'simulation', 'social', etc.
  display_name text NOT NULL,         -- "Neocortex", "Conscious Workspace", etc.
  description text,
  version text,                       -- 'v1', 'v2', etc.
  criticality text NOT NULL,          -- 'core', 'important', 'optional'
  weight numeric NOT NULL DEFAULT 1,   -- contribution to overall brain health

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================
-- BRAIN SUBSYSTEM STATUS (Per-User Runtime Status)
-- ============================================

CREATE TABLE IF NOT EXISTS public.brain_subsystem_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subsystem_id text NOT NULL REFERENCES brain_subsystems(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  status text NOT NULL,               -- 'inactive', 'initializing', 'partial', 'active', 'degraded', 'error'
  last_ok_at timestamptz,            -- last known successful run
  last_error_at timestamptz,         -- last time an error occurred
  last_run_at timestamptz,           -- last time the subsystem's main loop ran

  health_score numeric,              -- 0..1 (calculated periodically)
  details jsonb                      -- arbitrary metadata (version, notes, etc.)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_subsystem_status_user_subsystem
  ON public.brain_subsystem_status (user_id, subsystem_id);

-- ============================================
-- BRAIN HEALTH SNAPSHOTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.brain_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  snapshot_time timestamptz NOT NULL DEFAULT now(),

  overall_health numeric NOT NULL,     -- 0..1
  coverage_score numeric,              -- how many subsystems are active vs expected
  error_pressure numeric,              -- 0..1: how much recent error activity
  latency_pressure numeric,            -- 0..1: how delayed loops are
  data_freshness_score numeric,        -- 0..1: freshness of key signals

  subsystem_scores jsonb,              -- { [subsystem_id]: health_score }
  missing_subsystems jsonb,            -- list of subsystems that should be active but aren't

  notes text,
  recommendations jsonb                -- structured suggestions
);

CREATE INDEX IF NOT EXISTS idx_brain_health_snapshots_user_time
  ON public.brain_health_snapshots (user_id, snapshot_time DESC);

-- ============================================
-- BRAIN ERROR EVENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.brain_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  occurred_at timestamptz NOT NULL DEFAULT now(),

  subsystem_id text,                  -- may be null if general
  severity text NOT NULL,             -- 'info', 'warning', 'error', 'critical'

  error_code text,                    -- arbitrary code
  message text NOT NULL,
  context jsonb,                      -- { stack, requestId, payloadSummary, etc. }

  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  resolution_notes text
);

CREATE INDEX IF NOT EXISTS idx_brain_error_events_user_time
  ON public.brain_error_events (user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_brain_error_events_subsystem
  ON public.brain_error_events (subsystem_id, occurred_at DESC);

-- ============================================
-- BRAIN CAPABILITIES
-- ============================================

CREATE TABLE IF NOT EXISTS public.brain_capabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  capability_key text NOT NULL,       -- 'deep_autopilot', 'life_simulation', 'career_coach', etc.
  enabled boolean NOT NULL DEFAULT false,
  level numeric,                      -- 0..1: capability maturity/usefulness
  source_subsystems text[],           -- subsystems this capability depends on

  notes text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_brain_capabilities_user_cap
  ON public.brain_capabilities (user_id, capability_key);

-- ============================================
-- BRAIN CHANGELOG
-- ============================================

CREATE TABLE IF NOT EXISTS public.brain_changelog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),

  subsystem_id text,
  change_type text NOT NULL,          -- 'upgraded', 'degraded', 'enabled', 'disabled', 'migrated', etc.
  description text NOT NULL,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_brain_changelog_user
  ON public.brain_changelog (user_id, created_at DESC);

-- ============================================
-- SEED BRAIN SUBSYSTEMS
-- ============================================

INSERT INTO public.brain_subsystems (id, group_name, display_name, description, version, criticality, weight) VALUES
-- Core Systems
('agi_kernel', 'core', 'AGI Kernel', 'Core AGI reasoning and decision-making engine', 'v1', 'core', 1.0),
('neocortex_v1', 'core', 'Neocortex', 'Pattern recognition, signal processing, and skill extraction', 'v1', 'core', 1.0),
('conscious_workspace_v3', 'core', 'Conscious Workspace', 'Global workspace for attention, focus, and cross-system coordination', 'v3', 'core', 1.0),
('inner_monologue_v2', 'core', 'Inner Monologue', 'Internal reasoning and self-dialogue engine', 'v2', 'core', 0.8),

-- Memory Systems
('narrative_intelligence', 'memory', 'Narrative Intelligence', 'Life chapters, themes, and story tracking', 'v1', 'important', 0.7),
('self_mirror_v1', 'memory', 'Self Mirror', 'Global sense of self and identity reflection', 'v1', 'important', 0.7),
('wisdom_engine_v1', 'memory', 'Wisdom Engine', 'Meta-learning and experience distillation', 'v1', 'important', 0.6),

-- Planning & Execution
('meta_planner_v1', 'planning', 'Meta-Planner', 'Conflict resolution and priority arbitration', 'v1', 'core', 0.9),
('cerebellum_v1', 'planning', 'Cerebellum', 'Automatic routines and motor control', 'v1', 'important', 0.7),
('timeline_coach', 'planning', 'Timeline Coach', 'Guided timeline decision-making', 'v1', 'important', 0.7),
('destiny_engine', 'planning', 'Destiny Engine', 'Long-arc identity and life trajectory', 'v1', 'important', 0.8),

-- Emotion & Somatic
('emotional_resonance_v2', 'emotion', 'Emotional Resonance', 'Emotion detection and response style', 'v2', 'important', 0.6),
('somatic_device', 'emotion', 'Somatic Loop', 'Energy, fatigue, and body awareness', 'v2', 'important', 0.6),

-- Social & Culture
('social_graph_intel_v2', 'social', 'Social Graph Intelligence', 'Relationship graph and insights', 'v2', 'important', 0.6),
('theory_of_mind', 'social', 'Theory of Mind', 'Mental models of self and others', 'v1', 'important', 0.6),
('ethnographic_intel', 'social', 'Ethnographic Intelligence', 'Cultural context and alignment', 'v1', 'optional', 0.4),

-- Creative & Wisdom
('creative_cortex_v2', 'creative', 'Creative Cortex', 'Idea generation and creative patterns', 'v2', 'optional', 0.5),

-- Simulation & Prediction
('simulation_v2', 'simulation', 'Multi-Timeline Simulation', 'Future scenario projection', 'v2', 'important', 0.7),
('workspace_timeline_layer', 'simulation', 'Workspace Timeline Layer', 'Thread-to-timeline linking', 'v1', 'optional', 0.4),
('behavior_prediction', 'simulation', 'Behavior Prediction', 'Self and contact behavior forecasting', 'v1', 'important', 0.6),
('desire_model', 'simulation', 'Desire Modeling', 'User and contact desire profiles', 'v1', 'important', 0.6),

-- Ethics & Values
('ethical_compass', 'ethics', 'Ethical Compass', 'Value alignment and guardrails', 'v1', 'core', 0.8),

-- Registry & Diagnostics (self-referential)
('brain_registry_v1', 'core', 'Brain Registry', 'Master registry of all brain subsystems', 'v1', 'core', 0.5),
('brain_diagnostics_v1', 'core', 'Brain Diagnostics', 'Health monitoring and diagnostics', 'v1', 'core', 0.5),
-- Relational Mind v2
('tom_engine_v2', 'social', 'Theory of Mind Engine', 'Mental models of key people and their likely reactions', 'v2', 'important', 0.7),
('social_graph_v2', 'social', 'Social Graph Intelligence', 'Rich relationship graph and patterns', 'v2', 'important', 0.7),
('empathic_resonance_v1', 'emotion', 'Empathic Resonance', 'Emotional mirroring and context-aware responses', 'v1', 'important', 0.6),
-- AGI Kernel v2
('agi_kernel_v2', 'core', 'AGI Kernel v2', 'Autonomous cognitive loop (Default Mode Network) for Pulse Brain', 'v2', 'core', 1.5),
-- Meet Pulse & Conscious Console
('meet_pulse_v1', 'interface', 'Meet Pulse Birth Experience', 'First-contact ritual that introduces the full Pulse Brain and lets the user set preferences', 'v1', 'important', 0.7),
('conscious_console_v1', 'interface', 'Conscious Console', 'Central UI and backend surface for Pulse Brain status, insights, and preferences', 'v1', 'important', 1.0),
-- Presence Orchestrator
('presence_orchestrator_v2', 'interface', 'Presence & Notification Orchestrator', 'Decides when, where, and how Pulse surfaces insights across console, notifications, email, and voice', 'v2', 'core', 1.2),
-- Ethnographic Intelligence
('ethnographic_intelligence_v1', 'context', 'Ethnographic Intelligence', 'Models organizational, industry, team, leadership, and relationship culture to guide strategy and behavior', 'v1', 'important', 1.0),
-- Strategic Mind
('strategic_mind_v1', 'executive', 'Strategic Mind', 'Unifies all Pulse Brain subsystems to resolve conflicts, coordinate goals, and generate coherent life strategy', 'v1', 'core', 1.5),
-- Meet the Strategist UX
('strategic_strategist_ux_v1', 'interface', 'Strategist UX v1', 'User-facing experience to review, understand, and steer the Strategic Mind''s stance and recommendations', 'v1', 'important', 0.9),
-- Executive Council Mode
('executive_council_mode_v1', 'executive', 'Executive Council Mode v1', 'Multi-subsystem decision council where Strategic Mind, Ethnographic Intelligence, Relational Mind, Financial Coach, Health, Identity, and Destiny each weigh in and synthesize a final recommendation', 'v1', 'important', 1.3),
-- Decision Theater
('decision_theater_v1', 'interface', 'Decision Theater v1', 'Interactive boardroom UI for Executive Council sessions and major life decisions', 'v1', 'important', 0.8),
-- What-If Replay Mode
('what_if_replay_mode_v1', 'simulation', 'What-If Replay Mode v1', 'Alternate timeline simulator that compares baseline and hypothetical life paths using the Destiny and Timeline engines', 'v1', 'important', 1.1),
-- Life Canon
('life_canon_v1', 'narrative', 'Life Canon v1', 'The master narrative engine that defines life chapters, canon events, identity shifts, themes, conflicts, and the evolving story of the user''s life', 'v1', 'core', 1.7),
-- Life Canon Playback
('life_canon_playback_v1', 'interface', 'Life Canon Playback v1', 'Cinematic playback and timeline UI for the Life Canon chapters, canon events, and identity shifts', 'v1', 'important', 0.9),
-- Archetype Engine
('archetype_engine_v2', 'narrative', 'Archetype Engine v2', 'Models user behavior and life chapters as evolving archetypes (Warrior, Builder, King, etc.), distinguishing healthy vs shadow expression and feeding this into strategy, decisions, and coaching', 'v2', 'important', 1.2),
-- Mythic Coach
('mythic_coach_v1', 'coach', 'Mythic Coach v1', 'Archetype-based coaching engine that sets training focus, creates archetype plans, generates missions, and provides weekly reflections to grow healthy Warrior/Builder/King/etc patterns', 'v1', 'important', 1.3),
-- Mythic Coach Voice Persona
('mythic_coach_voice_persona_v1', 'interface', 'Mythic Coach Voice Persona v1', 'Dedicated voice persona for archetype-based coaching, with tone adapting to archetype mix and emotional state', 'v1', 'important', 0.8),
-- Mythic Dojo
('mythic_dojo_v1', 'coach', 'Mythic Dojo v1', 'Gamified dojo layer for archetype training: belts, XP, streaks, achievements, and a dedicated dojo UI', 'v1', 'important', 1.1),
-- Mythic Intelligence Layer
('mythic_intelligence_layer_v1', 'narrative', 'Mythic Intelligence Layer v1', 'Cross-cutting mythic brain that turns life into chapters, provides voice-guided story sessions, classifies deals into archetypes, and feeds Identity/Destiny/Power/Coaching with mythic context', 'v1', 'important', 1.4),
-- Mythic Coach Engine
('mythic_coach_engine_v1', 'coach', 'Mythic Coach Engine v1', 'Archetypal, story-driven coach that speaks in mythic language tailored to current life chapter, archetypes, and deals. Suggests archetypal plays and runs micro-sessions that reframe situations as part of the heroic arc', 'v1', 'important', 1.2),
-- Boardroom Brain
('boardroom_brain_v1', 'strategy', 'Boardroom Brain v1', 'Strategic Mind + Executive Council + Decision Theater. Turns goals into strategies, runs multi-persona council votes on decisions, and visualizes scenarios with what-if simulations', 'v1', 'important', 1.5),
-- Master Brain Registry + Diagnostics
('master_brain_registry_v1', 'core', 'Master Brain Registry + Diagnostics v1', 'Meta-system that tracks all Pulse engines, monitors health, runs diagnostics, and provides system-wide status and recommendations', 'v1', 'core', 1.0),
-- Master Brain Evolution
('master_brain_evolution_v1', 'core', 'Master Brain Evolution Engine v1', 'Self-improvement system that turns diagnostics into improvement ideas, runs experiments, maintains changelog, and provides upgrade suggestions', 'v1', 'core', 1.1)

ON CONFLICT (id) DO UPDATE SET
  group_name = EXCLUDED.group_name,
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  version = EXCLUDED.version,
  criticality = EXCLUDED.criticality,
  weight = EXCLUDED.weight,
  updated_at = now();

