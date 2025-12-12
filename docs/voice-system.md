# Voice System Architecture

## Overview

The Pulse OS voice system provides emotion-aware, coach-specific voice selection with user customization options.

## Database Schema

### `voice_profiles` Table
Stores available voice profiles (archetypes) with their style configurations.

**Key Fields:**
- `key` (text, unique): Profile identifier (e.g., "hype_warrior", "zen_therapist")
- `name` (text): Display name
- `description` (text): User-facing description
- `style` (jsonb): Tone matrix configuration
- `default_speed`, `default_energy`, `default_intensity` (numeric): Default TTS parameters

### `user_voice_settings` Table
Per-user voice preferences.

**Key Fields:**
- `user_id` (uuid, PK): References auth.users
- `active_voice_key` (text): Global default voice
- `preferred_coach_voice` (jsonb): Per-coach overrides
  - Format: `{ "sales": "voice_key", "confidant": "auto", ... }`
  - `"auto"` means use emotion-aware selection
- `speaking_rate`, `pitch_adjust` (numeric): TTS adjustments

### `coach_voice_overrides` Table
System-wide coach default voice overrides (admin-configurable).

**Key Fields:**
- `coach_id` (text, unique): Coach identifier
- `voice_profile_id` (uuid): References voice_profiles
- `emotion_overrides` (jsonb): Emotion → voice mapping

### `voice_emotion_overrides` Table
User-defined emotion-based voice overrides.

**Key Fields:**
- `user_id` (uuid): References auth.users
- `coach_id` (text): Coach identifier
- `emotion` (text): Emotion type
- `override_voice` (text): Voice profile key to use
- `speed_override`, `energy_override`, `warmth_override` (numeric, optional)
- `is_active` (boolean)

### `voice_switch_events` Table
Analytics/logging for voice switches.

## Voice Resolution Flow

1. **User Preference Check**: If user has set a specific voice for this coach (not "auto"), use it.
2. **Roleplay Context**: For roleplay coach, use character-specific voice if available.
3. **Emotion Override**: 
   - Check user-defined emotion overrides first
   - Then check Emotion OS state
   - Apply override if intensity >= 0.6
4. **Coach Default**: Use coach's default voice from `DEFAULT_COACH_VOICE_MAP` or database override.
5. **Career Adjustments**: Apply career-level adjustments (rookie support, elite efficiency, etc.)

## Coach → Voice Mappings

### Default Mappings (`lib/voices/registry.ts`)
- `sales` → `hype_warrior`
- `confidant` → `zen_therapist`
- `career` → `executive_strategist`
- `philosophy` → `samurai_mentor`
- `emotional` → `zen_therapist`
- `autopilot` → `executive_strategist`
- `roleplay` → `friendly_butler` (dynamic)
- `general` → `friendly_butler`

### Coach Personas (`lib/voice/personas/coach-voice-personas.ts`)
Note: This file uses different voice keys. **Needs alignment** with registry.

Current personas:
- `sales` → `hype_coach` (should map to `hype_warrior`)
- `confidant` → `calm_therapist` (should map to `zen_therapist`)
- `executive` → `pulse_default` (not in registry)
- `warrior` → `jarvis_advisor` (not in registry)
- `negotiation` → `jarvis_advisor` (not in registry)
- `emotional` → `calm_therapist` (should map to `zen_therapist`)
- `strategy` → `jarvis_advisor` (not in registry)

## Emotion → Voice Overrides

Default emotion overrides (`lib/voices/registry.ts`):
- `stressed`, `overwhelmed`, `anxious`, `depressed` → `zen_therapist`
- `hyped` → `hype_warrior`
- `angry` → `analytical_guide` (de-escalation)
- `calm` → null (use coach default)

## Key Functions

### `resolveVoice(context: VoiceResolutionContext)`
Main voice resolution function. Returns `ResolvedVoice` with profile and reasoning.

### `getDynamicVoiceProfile(userId, coachId, userInput?)`
Emotion-aware voice selection with user input keyword detection.

### `getCurrentEmotionState(userId)`
Gets user's current emotional state from Emotion OS. Handles Clerk ID → database ID conversion.

### `getDefaultVoiceForCoach(coachId)`
Gets default voice for a coach, checking database overrides first.

## API Endpoints

### `GET /api/voices/[coach]`
Resolves voice for a specific coach, considering:
- User preferences
- Emotion state
- Career context

### `GET /api/voice/settings`
Gets user's voice settings.

### `POST /api/voice/settings`
Updates user's voice settings (including per-coach overrides).

## Known Issues & TODOs

1. **Voice Key Mismatch**: `coach-voice-personas.ts` uses different voice keys than `registry.ts`. Need to align.
2. **Missing Voice Profiles**: Some personas reference voices (`jarvis_advisor`, `hype_coach`, `calm_therapist`) that don't exist in seed data.
3. **Type Safety**: Some `any` types in voice router need stronger typing.
4. **Error Handling**: Some API routes need better error messages for missing voice profiles.

## Future Enhancements

1. **Persona Tuning Matrix**: Per-coach, per-emotion, per-context voice style matrix.
2. **Voice Preview**: Test voice before applying.
3. **Analytics Dashboard**: Voice switch event analysis.
4. **A/B Testing**: Test different voice styles for effectiveness.



