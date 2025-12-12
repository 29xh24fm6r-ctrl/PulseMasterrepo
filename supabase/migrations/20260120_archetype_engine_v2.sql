-- Archetype Engine v2 - Deep Mythic Model
-- supabase/migrations/20260120_archetype_engine_v2.sql

-- ============================================
-- ARCHETYPE DEFINITIONS (Global Seeded)
-- ============================================

CREATE TABLE IF NOT EXISTS public.archetype_definitions (
  id text PRIMARY KEY,
  display_name text NOT NULL,
  description text NOT NULL,
  healthy_expression jsonb,  -- examples of healthy patterns
  shadow_expression jsonb,   -- unhealthy/distorted patterns
  core_gifts jsonb,          -- what this archetype brings
  core_risks jsonb           -- watchouts
);

-- Seed base archetypes
INSERT INTO public.archetype_definitions (id, display_name, description, healthy_expression, shadow_expression, core_gifts, core_risks)
VALUES
  ('warrior', 'Warrior', 'Fighting, pushing, grinding, competitive drive', '{"examples": ["Disciplined training", "Standing up for values", "Protecting others"]}', '{"examples": ["Aggression", "Burnout", "Ruthless competition"]}', '["Courage", "Discipline", "Protection"]', '["Burnout", "Aggression", "Isolation"]'),
  ('builder', 'Builder', 'Systematic, constructive, process-focused, creating systems', '{"examples": ["Building sustainable systems", "Methodical progress", "Infrastructure thinking"]}', '{"examples": ["Rigidity", "Over-engineering", "Control obsession"]}', '["Structure", "Sustainability", "Method"]', '["Rigidity", "Perfectionism", "Control"]'),
  ('king', 'King/Queen', 'Vision, responsibility, leadership, sovereignty', '{"examples": ["Clear vision", "Taking responsibility", "Empowering others"]}', '{"examples": ["Tyranny", "Control", "Isolation"]}', '["Vision", "Responsibility", "Leadership"]', '["Tyranny", "Control", "Isolation"]'),
  ('sage', 'Sage', 'Reflection, wisdom, long-view, teaching', '{"examples": ["Deep reflection", "Sharing wisdom", "Long-term thinking"]}', '{"examples": ["Detachment", "Analysis paralysis", "Avoiding action"]}', '["Wisdom", "Perspective", "Teaching"]', '["Detachment", "Inaction", "Over-analysis"]'),
  ('lover', 'Lover', 'Connection, intimacy, presence, passion', '{"examples": ["Deep connection", "Presence", "Passion for life"]}', '{"examples": ["Codependency", "Obsession", "Loss of self"]}', '["Connection", "Intimacy", "Passion"]', '["Codependency", "Obsession", "Loss of boundaries"]'),
  ('magician', 'Magician', 'Transformation, change, alchemy, vision', '{"examples": ["Transforming situations", "Seeing possibilities", "Creating change"]}', '{"examples": ["Manipulation", "Deception", "Illusion"]}', '["Transformation", "Vision", "Change"]', '["Manipulation", "Deception", "Illusion"]'),
  ('trickster', 'Trickster', 'Disruption, rule-bending, humor, innovation', '{"examples": ["Breaking rules creatively", "Humor", "Innovation"]}', '{"examples": ["Chaos", "Destruction", "Irresponsibility"]}', '["Innovation", "Humor", "Flexibility"]', '["Chaos", "Destruction", "Irresponsibility"]'),
  ('guardian', 'Guardian', 'Protection, duty, care, responsibility', '{"examples": ["Protecting others", "Fulfilling duty", "Caring deeply"]}', '{"examples": ["Over-protection", "Control", "Sacrifice"]}', '["Protection", "Duty", "Care"]', '["Over-protection", "Control", "Self-sacrifice"]'),
  ('creator', 'Creator', 'Innovation, artistry, expression, making', '{"examples": ["Creating art", "Innovation", "Self-expression"]}', '{"examples": ["Perfectionism", "Isolation", "Self-absorption"]}', '["Creativity", "Innovation", "Expression"]', '["Perfectionism", "Isolation", "Self-absorption"]'),
  ('rebel', 'Rebel', 'Defiance, nonconformity, breaking norms', '{"examples": ["Standing against injustice", "Breaking harmful norms", "Authenticity"]}', '{"examples": ["Destruction", "Recklessness", "Isolation"]}', '["Courage", "Authenticity", "Change"]', '["Destruction", "Recklessness", "Isolation"]'),
  ('healer', 'Healer', 'Repair, care, restoration, nurturing', '{"examples": ["Healing others", "Restoration", "Nurturing growth"]}', '{"examples": ["Codependency", "Burnout", "Neglecting self"]}', '["Healing", "Care", "Restoration"]', '["Codependency", "Burnout", "Self-neglect"]'),
  ('explorer', 'Explorer', 'Curiosity, expansion, adventure, discovery', '{"examples": ["Exploring new territories", "Curiosity", "Adventure"]}', '{"examples": ["Restlessness", "Avoidance", "Lack of depth"]}', '["Curiosity", "Adventure", "Discovery"]', '["Restlessness", "Avoidance", "Lack of commitment"]')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- USER ARCHETYPE PROFILES (Overall State)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_archetype_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  dominant_archetypes jsonb,       -- ordered list [{id, strength, mode:'healthy|shadow'}]
  suppressed_archetypes jsonb,     -- archetypes user rarely expresses but might need
  context_notes jsonb              -- e.g. 'at work, strong Warrior/Strategist; at home, Guardian/Lover'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_archetype_profiles_user
  ON public.user_archetype_profiles (user_id);

-- ============================================
-- CHAPTER ARCHETYPES (Per Chapter)
-- ============================================

CREATE TABLE IF NOT EXISTS public.chapter_archetypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  chapter_id uuid NOT NULL REFERENCES life_chapters(id) ON DELETE CASCADE,

  created_at timestamptz DEFAULT now(),

  archetype_mix jsonb,           -- [{id, strength, mode, notes}]
  primary_archetype_id text,     -- link to archetype_definitions.id
  notes text
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chapter_archetypes_chapter
  ON public.chapter_archetypes (chapter_id);

-- ============================================
-- ARCHETYPE EVENTS (Moments of Expression)
-- ============================================

CREATE TABLE IF NOT EXISTS public.archetype_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz DEFAULT now(),

  archetype_id text NOT NULL REFERENCES archetype_definitions(id),
  mode text NOT NULL,           -- 'healthy' or 'shadow'
  intensity numeric NOT NULL,   -- 0..1

  source text,                  -- 'council','decision','behavior','reflection'
  source_id uuid,
  description text,
  linked_canon_event_id uuid REFERENCES canon_events(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_archetype_events_user_time
  ON public.archetype_events (user_id, created_at DESC);

-- ============================================
-- ARCHETYPE SNAPSHOTS (Periodic Overall)
-- ============================================

CREATE TABLE IF NOT EXISTS public.archetype_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  snapshot_time timestamptz DEFAULT now(),

  current_mix jsonb,           -- [{id, strength, mode}]
  rising_archetypes jsonb,
  fading_archetypes jsonb,
  narrative_summary text
);

CREATE INDEX IF NOT EXISTS idx_archetype_snapshots_user_time
  ON public.archetype_snapshots (user_id, snapshot_time DESC);


