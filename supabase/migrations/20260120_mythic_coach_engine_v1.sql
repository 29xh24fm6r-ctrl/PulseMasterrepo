-- Mythic Coach Engine v1 - Archetypal, Story-Driven Coach
-- supabase/migrations/20260120_mythic_coach_engine_v1.sql

-- ============================================
-- MYTHIC PLAYBOOKS (Reusable Archetypal Plays)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  archetype_id uuid REFERENCES mythic_archetypes(id),
  context text NOT NULL,        -- 'deal', 'habit', 'identity', 'relationship', 'crisis'
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  triggers jsonb,               -- pattern tags, e.g. ['delay','avoidance','overwhelm']
  actions jsonb,                -- structured steps ['do_X','say_Y','prepare_Z']
  example_language jsonb,       -- snippets for coach voice
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mythic_playbooks_context_archetype
  ON public.mythic_playbooks (context, archetype_id);

-- ============================================
-- MYTHIC COACH SESSIONS (Coaching Interactions)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_coach_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode text NOT NULL,           -- 'ad_hoc' | 'daily_ritual' | 'deal_review' | 'crisis'
  source text NOT NULL,         -- 'user_opening_app' | 'weekly_planner' | 'deal_page' | 'emotion_os'
  life_chapter_id uuid REFERENCES life_chapters(id),
  dominant_archetype_id uuid REFERENCES mythic_archetypes(id),
  deal_id uuid,
  deal_archetype_run_id uuid REFERENCES deal_archetype_runs(id),
  input_summary text,           -- what the user came in with
  coach_response text,          -- full response text
  used_playbook_ids uuid[],   -- array of mythic_playbooks applied
  insights jsonb,               -- [{key, value}]
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mythic_coach_sessions_user_time
  ON public.mythic_coach_sessions (user_id, created_at DESC);

-- ============================================
-- USER MYTHIC COACH SETTINGS (User Config)
-- ============================================

CREATE TABLE IF NOT EXISTS public.user_mythic_coach_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  intensity text NOT NULL DEFAULT 'medium',      -- 'soft', 'medium', 'warrior'
  tone text NOT NULL DEFAULT 'grounded',         -- 'grounded', 'epic', 'playful'
  session_length text NOT NULL DEFAULT 'short',  -- 'micro', 'short', 'deep'
  enabled boolean NOT NULL DEFAULT true,
  preferred_framework text DEFAULT 'heros_journey',  -- or 'samurai_path', 'stoic_trials'
  last_daily_ritual_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Seed default playbooks
INSERT INTO public.mythic_playbooks (archetype_id, context, name, slug, description, triggers, actions, example_language)
SELECT 
  (SELECT id FROM mythic_archetypes WHERE slug = 'hunter' LIMIT 1) as archetype_id,
  'deal' as context,
  'Hunter Facing Fortress' as name,
  'hunter_facing_fortress' as slug,
  'When a fast-moving Hunter archetype deal meets a slow, defensive Fortress organization.' as description,
  '["delay","bureaucracy","slow_response"]'::jsonb as triggers,
  '["Match their pace but set boundaries", "Document everything", "Build trust slowly", "Expect process delays"]'::jsonb as actions,
  '["The Fortress moves slowly, but it protects. Your Hunter energy needs patience here.", "This is a marathon, not a sprint. Your speed is an asset, but you must respect their process."]'::jsonb as example_language
WHERE NOT EXISTS (SELECT 1 FROM mythic_playbooks WHERE slug = 'hunter_facing_fortress');

INSERT INTO public.mythic_playbooks (archetype_id, context, name, slug, description, triggers, actions, example_language)
SELECT 
  NULL as archetype_id,
  'crisis' as context,
  'Reforging in the Dark Forest' as name,
  'reforging_dark_forest' as slug,
  'When overwhelmed, stuck, or in a prolonged difficult phase.' as description,
  '["overwhelm","stuck","burnout","fear"]'::jsonb as triggers,
  '["Acknowledge the darkness", "Find one small light", "Take one step forward", "Remember this is a chapter, not the whole story"]'::jsonb as actions,
  '["The Dark Forest is where heroes are forged. You are not lost—you are being tested.", "Every hero faces this. The question is not if you will emerge, but how you will emerge."]'::jsonb as example_language
WHERE NOT EXISTS (SELECT 1 FROM mythic_playbooks WHERE slug = 'reforging_dark_forest');

INSERT INTO public.mythic_playbooks (archetype_id, context, name, slug, description, triggers, actions, example_language)
SELECT 
  NULL as archetype_id,
  'habit' as context,
  'Phoenix Reset' as name,
  'phoenix_reset' as slug,
  'When a habit is broken or relapsed.' as description,
  '["relapse","broken_streak","shame","giving_up"]'::jsonb as triggers,
  '["Acknowledge the fall", "Rise again immediately", "Learn from the fall", "The streak is dead, but you are not"]'::jsonb as actions,
  '["The Phoenix does not fear death—it knows rebirth. Your streak died, but you rise again today.", "Every hero falls. The difference is getting back up. Today is day one again, and that is enough."]'::jsonb as example_language
WHERE NOT EXISTS (SELECT 1 FROM mythic_playbooks WHERE slug = 'phoenix_reset');

INSERT INTO public.mythic_playbooks (archetype_id, context, name, slug, description, triggers, actions, example_language)
SELECT 
  (SELECT id FROM mythic_archetypes WHERE slug = 'builder' LIMIT 1) as archetype_id,
  'habit' as context,
  'Builder''s Brick' as name,
  'builders_brick' as slug,
  'Steady compound action when impatient or wanting quick results.' as description,
  '["impatience","wanting_quick_results","overwhelm","distraction"]'::jsonb as triggers,
  '["One brick at a time", "Trust the compound", "Small daily actions", "The foundation matters more than speed"]'::jsonb as actions,
  '["The Builder knows that every great structure is built one brick at a time.", "You are building something that will last. Speed is not the goal—consistency is."]'::jsonb as example_language
WHERE NOT EXISTS (SELECT 1 FROM mythic_playbooks WHERE slug = 'builders_brick');

INSERT INTO public.mythic_playbooks (archetype_id, context, name, slug, description, triggers, actions, example_language)
SELECT 
  NULL as archetype_id,
  'habit' as context,
  'Samurai Cut Through Noise' as name,
  'samurai_cut_noise' as slug,
  'Focus session when distracted or overwhelmed by options.' as description,
  '["distraction","too_many_options","indecision","noise"]'::jsonb as triggers,
  '["Identify the one thing", "Cut away everything else", "Focus with discipline", "Execute with precision"]'::jsonb as actions,
  '["The Samurai cuts through noise with a single, focused strike. What is your one thing?", "Distraction is the enemy. Cut through it. What matters most right now?"]'::jsonb as example_language
WHERE NOT EXISTS (SELECT 1 FROM mythic_playbooks WHERE slug = 'samurai_cut_noise');


