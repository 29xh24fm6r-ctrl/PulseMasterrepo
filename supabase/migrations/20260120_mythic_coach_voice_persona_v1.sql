-- Mythic Coach Voice Persona v1 - Dedicated Voice for Archetype Coaching
-- supabase/migrations/20260120_mythic_coach_voice_persona_v1.sql

-- ============================================
-- MYTHIC VOICE MAPPINGS (Archetype/State → Voice Profile)
-- ============================================

CREATE TABLE IF NOT EXISTS public.mythic_voice_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- null user_id = system default config
  scope text NOT NULL DEFAULT 'system',  -- 'system' or 'user'

  archetype_id text,                    -- nullable: if null, global mythic coach default
  mode text,                            -- 'grow','stabilize','cool', or null
  intensity text,                       -- 'soft','balanced','intense', or null

  voice_profile_id uuid NOT NULL REFERENCES voice_profiles(id),

  style_overrides jsonb,                -- { tempo, warmth, directness, formality, metaphors_level, profanity_ok, etc. }

  is_default boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_mythic_voice_mappings_user
  ON public.mythic_voice_mappings (user_id, archetype_id);

-- Seed system voice profiles for Mythic Coach
-- Using key-based approach compatible with voice_profiles_v1 schema
INSERT INTO public.voice_profiles (key, display_name, description, provider, provider_voice_id, sort_order, is_active, created_at, updated_at)
SELECT 
  'mythic_sage' as key,
  'Mythic Sage' as display_name,
  'Calm, wise, archetype-oriented mentor voice. Story-driven, gentle but honest.' as description,
  'openai' as provider,
  'alloy' as provider_voice_id,
  100 as sort_order,
  true as is_active,
  now() as created_at,
  now() as updated_at
WHERE NOT EXISTS (SELECT 1 FROM public.voice_profiles WHERE key = 'mythic_sage')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.voice_profiles (key, display_name, description, provider, provider_voice_id, sort_order, is_active, created_at, updated_at)
SELECT 
  'battle_mentor' as key,
  'Battle Mentor' as display_name,
  'High-energy, focused, tactical mythic coach for Warrior/Builder phases.' as description,
  'openai' as provider,
  'echo' as provider_voice_id,
  101 as sort_order,
  true as is_active,
  now() as created_at,
  now() as updated_at
WHERE NOT EXISTS (SELECT 1 FROM public.voice_profiles WHERE key = 'battle_mentor')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.voice_profiles (key, display_name, description, provider, provider_voice_id, sort_order, is_active, created_at, updated_at)
SELECT 
  'shadow_mirror' as key,
  'Shadow Mirror' as display_name,
  'Quiet, reflective voice used for shadow work and difficult reflections.' as description,
  'openai' as provider,
  'nova' as provider_voice_id,
  102 as sort_order,
  true as is_active,
  now() as created_at,
  now() as updated_at
WHERE NOT EXISTS (SELECT 1 FROM public.voice_profiles WHERE key = 'shadow_mirror')
ON CONFLICT (key) DO NOTHING;

-- Get the voice profile IDs we just created and insert system-level mappings
WITH mythic_voices AS (
  SELECT id, key FROM public.voice_profiles 
  WHERE key IN ('mythic_sage', 'battle_mentor', 'shadow_mirror')
)
-- Insert system default mapping (Mythic Sage as default)
INSERT INTO public.mythic_voice_mappings (
  user_id, scope, archetype_id, mode, intensity, voice_profile_id, style_overrides, is_default, created_at, updated_at
)
SELECT 
  NULL as user_id,
  'system' as scope,
  NULL as archetype_id,
  NULL as mode,
  NULL as intensity,
  (SELECT id FROM mythic_voices WHERE key = 'mythic_sage' LIMIT 1) as voice_profile_id,
  '{"tempo":"medium-slow","warmth":"high","directness":"soft","formality":"medium","metaphors_level":"high"}'::jsonb as style_overrides,
  true as is_default,
  now() as created_at,
  now() as updated_at
WHERE EXISTS (SELECT 1 FROM mythic_voices WHERE key = 'mythic_sage')
  AND NOT EXISTS (
    SELECT 1 FROM public.mythic_voice_mappings 
    WHERE scope = 'system' AND is_default = true
  )
ON CONFLICT DO NOTHING;

-- Warrior archetype -> Battle Mentor
WITH battle_mentor_voice AS (
  SELECT id FROM public.voice_profiles WHERE key = 'battle_mentor' LIMIT 1
)
INSERT INTO public.mythic_voice_mappings (
  user_id, scope, archetype_id, mode, intensity, voice_profile_id, style_overrides, is_default, created_at, updated_at
)
SELECT 
  NULL as user_id,
  'system' as scope,
  'warrior' as archetype_id,
  NULL as mode,
  NULL as intensity,
  (SELECT id FROM battle_mentor_voice) as voice_profile_id,
  '{"tempo":"medium-fast","warmth":"medium","directness":"direct","formality":"low","metaphors_level":"medium"}'::jsonb as style_overrides,
  false as is_default,
  now() as created_at,
  now() as updated_at
WHERE EXISTS (SELECT 1 FROM battle_mentor_voice)
  AND NOT EXISTS (
    SELECT 1 FROM public.mythic_voice_mappings 
    WHERE scope = 'system' AND archetype_id = 'warrior'
  )
ON CONFLICT DO NOTHING;

-- Healer/Sage archetypes -> Mythic Sage
WITH sage_voice AS (
  SELECT id FROM public.voice_profiles WHERE key = 'mythic_sage' LIMIT 1
)
INSERT INTO public.mythic_voice_mappings (
  user_id, scope, archetype_id, mode, intensity, voice_profile_id, style_overrides, is_default, created_at, updated_at
)
SELECT 
  NULL as user_id,
  'system' as scope,
  unnest(ARRAY['healer', 'sage']) as archetype_id,
  NULL as mode,
  NULL as intensity,
  (SELECT id FROM sage_voice) as voice_profile_id,
  '{"tempo":"medium-slow","warmth":"high","directness":"soft","formality":"medium","metaphors_level":"high"}'::jsonb as style_overrides,
  false as is_default,
  now() as created_at,
  now() as updated_at
WHERE EXISTS (SELECT 1 FROM sage_voice)
  AND NOT EXISTS (
    SELECT 1 FROM public.mythic_voice_mappings 
    WHERE scope = 'system' AND archetype_id IN ('healer', 'sage')
  )
ON CONFLICT DO NOTHING;

