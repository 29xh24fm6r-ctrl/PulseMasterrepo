-- Mythic Intelligence Layer v1 - Mythic Brain for Pulse OS
-- supabase/migrations/20260120_mythic_intelligence_layer_v1.sql

-- ============================================
-- MYTHIC ARCHETYPES (Life, Deal, Power)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_archetypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('life', 'deal', 'power')),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  shadow_side text,
  gift_side text,
  triggers jsonb,
  strengths jsonb,
  pitfalls jsonb,
  recommended_strategies jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mythic_archetypes_kind_slug
  ON public.mythic_archetypes (kind, slug);

-- ============================================
-- LIFE CHAPTERS (User's Mythic Life Story)
-- ============================================

CREATE TABLE IF NOT EXISTS public.life_chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chapter_name text NOT NULL,
  timeframe_start date,
  timeframe_end date,
  dominant_archetype_id uuid REFERENCES mythic_archetypes(id),
  key_events jsonb,         -- [{id, title, date, source}]
  emotional_tone text,      -- e.g. 'ascend', 'collapse', 'dark_forest'
  lesson text,
  status text NOT NULL DEFAULT 'active', -- active | archived
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_life_chapters_user_time
  ON public.life_chapters (user_id, timeframe_start, timeframe_end);

-- ============================================
-- MYTHIC SESSIONS (Voice-Guided Story Sessions)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_type text NOT NULL, -- origin_story | dark_forest | rebirth | destiny_path | integration
  framework text NOT NULL,    -- heros_journey | samurai_path | stoic_trials | phoenix_cycle
  chapter_id uuid REFERENCES life_chapters(id),
  script_generated text,
  ssml text,
  audio_url text,
  insights jsonb,           -- [{prompt, response, tags}]
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mythic_sessions_user_time
  ON public.mythic_sessions (user_id, created_at DESC);

-- ============================================
-- DEAL ARCHETYPES (Deal-Specific Metadata)
-- ============================================

CREATE TABLE IF NOT EXISTS public.deal_archetypes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype_id uuid REFERENCES mythic_archetypes(id),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  negotiation_style text,
  financial_behavior jsonb,
  psychological_tells jsonb,
  recommended_counterplays jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_archetypes_archetype
  ON public.deal_archetypes (archetype_id);

-- ============================================
-- DEAL ARCHETYPE RUNS (Deal Classifications)
-- ============================================

CREATE TABLE IF NOT EXISTS public.deal_archetype_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deal_id uuid NOT NULL,   -- references deals table (by convention)
  archetype_id uuid NOT NULL REFERENCES mythic_archetypes(id),
  confidence numeric(3,2) CHECK (confidence >= 0 AND confidence <= 1),
  signals jsonb,           -- extracted behavioral/financial signals
  recommended_strategy text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_archetype_runs_user_deal
  ON public.deal_archetype_runs (user_id, deal_id, created_at DESC);

-- ============================================
-- USER MYTHIC PROFILE (Aggregated Mythic State)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_mythic_profile (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  dominant_life_archetypes jsonb,   -- [{archetype_id, weight}]
  recurring_motifs jsonb,           -- ['exile', 'rebirth', ...]
  current_chapter_id uuid REFERENCES life_chapters(id),
  current_phase text,               -- setup | departure | ordeal | return | integration
  last_story_refresh_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_mythic_profile_chapter
  ON public.user_mythic_profile (current_chapter_id);

-- Seed some default life archetypes
INSERT INTO public.mythic_archetypes (kind, name, slug, description, shadow_side, gift_side, strengths, pitfalls, recommended_strategies)
VALUES
  ('life', 'The Hero', 'hero', 'The classic hero''s journey archetype - called to adventure, faces trials, returns transformed.', 'Hubris, overconfidence', 'Courage, growth', '["Resilience", "Growth mindset", "Leadership"]'::jsonb, '["Overextending", "Ignoring warnings"]'::jsonb, '["Accept the call", "Find mentors", "Embrace the return"]'::jsonb),
  ('life', 'The Builder', 'builder', 'Focused on creating structures, systems, and lasting legacies.', 'Perfectionism, rigidity', 'Vision, execution', '["Planning", "Persistence", "Quality"]'::jsonb, '["Analysis paralysis", "Burnout"]'::jsonb, '["Set milestones", "Delegate", "Celebrate progress"]'::jsonb),
  ('life', 'The Wanderer', 'wanderer', 'Explorer seeking truth, meaning, and new experiences.', 'Restlessness, lack of direction', 'Curiosity, adaptability', '["Openness", "Flexibility", "Discovery"]'::jsonb, '["Commitment issues", "FOMO"]'::jsonb, '["Document insights", "Choose depth", "Return to integrate"]'::jsonb),
  ('life', 'The Sage', 'sage', 'Wisdom-seeker who learns from experience and teaches others.', 'Overthinking, detachment', 'Wisdom, perspective', '["Reflection", "Teaching", "Clarity"]'::jsonb, '["Inaction", "Isolation"]'::jsonb, '["Share knowledge", "Act on wisdom", "Stay connected"]'::jsonb),
  ('life', 'The Magician', 'magician', 'Transforms reality through vision, innovation, and boundary-crossing.', 'Manipulation, escapism', 'Transformation, innovation', '["Vision", "Innovation", "Transformation"]'::jsonb, '["Unrealistic expectations", "Bypassing work"]'::jsonb, '["Ground vision", "Test assumptions", "Build systematically"]'::jsonb),
  ('deal', 'The Hunter', 'hunter', 'Aggressive, fast-moving dealmaker focused on closing.', 'Ruthlessness, impatience', 'Speed, decisiveness', '["Speed", "Focus", "Results"]'::jsonb, '["Missing details", "Burned bridges"]'::jsonb, '["Match pace", "Set boundaries", "Document everything"]'::jsonb),
  ('deal', 'The Fortress', 'fortress', 'Defensive, risk-averse, process-heavy organization.', 'Paralysis, bureaucracy', 'Stability, protection', '["Stability", "Risk management", "Process"]'::jsonb, '["Slow decisions", "Missed opportunities"]'::jsonb, '["Respect process", "Provide data", "Build trust slowly"]'::jsonb),
  ('deal', 'The Trickster', 'trickster', 'Unpredictable, boundary-testing, creative dealmaker.', 'Chaos, unreliability', 'Innovation, flexibility', '["Creativity", "Flexibility", "Surprise"]'::jsonb, '["Unpredictability", "Trust issues"]'::jsonb, '["Stay flexible", "Document carefully", "Expect pivots"]'::jsonb),
  ('deal', 'The Visionary', 'visionary', 'Big-picture, future-focused, relationship-driven.', 'Unrealistic expectations', 'Inspiration, long-term thinking', '["Vision", "Relationships", "Future focus"]'::jsonb, '["Vague terms", "Execution gaps"]'::jsonb, '["Align on vision", "Get specifics", "Build relationships"]'::jsonb),
  ('deal', 'The Leviathan', 'leviathan', 'Large, powerful, slow-moving organization with immense resources.', 'Inertia, complexity', 'Resources, scale', '["Resources", "Scale", "Stability"]'::jsonb, '["Slow decisions", "Complexity"]'::jsonb, '["Be patient", "Navigate hierarchy", "Leverage resources"]'::jsonb)
ON CONFLICT (slug) DO NOTHING;


