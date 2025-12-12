# Quality Pass: Coach Voice Personas & Emotion-Aware Voice Switching

**Date**: 2025-01-XX  
**Scope**: Full repository deep dive with focus on coach voice personas, voice profile system, and emotion-aware voice switching

## Summary

Completed comprehensive audit and fixes for the Pulse OS voice system, focusing on coach voice personas, user voice settings, and emotion-aware voice switching.

## Key Fixes

### 1. Voice Key Alignment
**Issue**: Mismatch between voice profile keys used in different parts of the system.
- `coach-voice-personas.ts` used keys like `hype_coach`, `calm_therapist`, `jarvis_advisor`
- `registry.ts` and `seed.ts` used keys like `hype_warrior`, `zen_therapist`, `executive_strategist`

**Fix**: Aligned all voice keys to match the actual voice profiles defined in `lib/voices/seed.ts`:
- `hype_coach` → `hype_warrior`
- `calm_therapist` → `zen_therapist`
- `jarvis_advisor` → `executive_strategist` or `hype_warrior` (context-dependent)
- `pulse_default` → `friendly_butler`

### 2. Emotion State User ID Conversion
**Issue**: `getCurrentEmotionState()` didn't handle Clerk ID to database ID conversion, causing queries to fail.

**Fix**: Added automatic Clerk ID → database ID conversion with fallback.

### 3. Voice Router Missing Import
**Issue**: `lib/voices/router.ts` referenced `VOICE_ARCHETYPES` without importing it.

**Fix**: Added import from `./seed`.

### 4. Type Safety Improvements
**Issue**: Multiple `any` types in voice-related code.

**Fixes**:
- Replaced `any` with proper `VoiceProfile` type in router
- Fixed type assertions in registry
- Improved error handling types in API routes

### 5. Unused Functions
**Issue**: `findVoiceOverride` and `logVoiceSwitchEvent` were defined but never used.

**Fix**: Integrated `findVoiceOverride` into emotion switcher flow and added `logVoiceSwitchEvent` call for analytics.

### 6. API Route Error Handling
**Issue**: API routes had weak error handling and validation.

**Fixes**:
- Added input validation for voice settings API
- Improved error messages with proper type checking
- Added coach ID validation
- Better handling of missing user records

### 7. Coach Voice Persona Completeness
**Issue**: Not all coaches from registry had corresponding personas.

**Fix**: Added missing coaches (`career`, `philosophy`, `autopilot`, `roleplay`, `general`) to `COACH_VOICE_PERSONAS`.

## Architecture Improvements

### Centralized Coach-to-Voice Mapping
- `lib/voices/registry.ts`: System-wide defaults and emotion overrides
- `lib/voice/personas/coach-voice-personas.ts`: Detailed persona configurations with speaking styles
- Both now use consistent voice profile keys

### Emotion-Aware Voice Switching Flow
1. User preference check (highest priority)
2. User-defined emotion overrides
3. Emotion OS state detection
4. Coach default voice
5. Career context adjustments

### Database Schema Verification
- ✅ `voice_profiles` table exists with proper structure
- ✅ `user_voice_settings` table with `preferred_coach_voice` JSONB field
- ✅ `coach_voice_overrides` table for system-wide defaults
- ✅ `voice_emotion_overrides` table for user customizations
- ✅ `voice_switch_events` table for analytics

## Documentation Created

1. **`docs/voice-system.md`**: Comprehensive architecture documentation covering:
   - Database schema
   - Voice resolution flow
   - Coach → voice mappings
   - Emotion → voice overrides
   - API endpoints
   - Known issues and future enhancements

## Remaining Known Issues

1. **Lint Warnings**: Many `@typescript-eslint/no-explicit-any` warnings throughout the codebase (not voice-specific). These are lower priority but should be addressed incrementally.

2. **Missing Voice Profile Validation**: No validation that voice profile keys referenced in personas actually exist in the database. Consider adding a startup check or migration.

3. **Voice Preview**: No UI for testing voices before applying (mentioned in docs as future enhancement).

4. **Analytics Dashboard**: `voice_switch_events` table exists but no dashboard to view analytics (future enhancement).

## Testing Recommendations

### Manual Smoke Tests
1. **New User Onboarding → Voice Setup**
   - Sign up / login
   - Visit voice settings
   - Set default voice
   - Set per-coach overrides
   - Start conversations with different coaches
   - Verify no console errors

2. **Emotion Shift → Voice Switching**
   - Trigger stressed/overwhelmed state
   - Open Confidant coach
   - Verify voice switches to `zen_therapist`
   - Trigger high energy state
   - Open Sales coach
   - Verify voice matches energy

3. **Settings Persistence**
   - Change default voice
   - Refresh page
   - Verify persistence
   - Change per-coach voice
   - Start conversation
   - Verify respected

## Files Modified

### Core Voice System
- `lib/voices/router.ts`: Fixed missing import, improved types
- `lib/voices/registry.ts`: Fixed type assertions
- `lib/voice/emotion-switcher.ts`: Fixed voice keys, integrated user overrides, added logging
- `lib/voice/personas/coach-voice-personas.ts`: Fixed voice keys, added missing coaches
- `lib/emotion-os/index.ts`: Fixed Clerk ID conversion

### API Routes
- `app/api/voices/[coach]/route.ts`: Added validation, improved error handling
- `app/api/voice/settings/route.ts`: Added input validation, improved error handling

### Documentation
- `docs/voice-system.md`: New comprehensive architecture doc
- `docs/quality-pass-coach-voices.md`: This file

## Next Steps

1. **Run Manual Tests**: Execute the smoke tests above to verify fixes work in practice.

2. **Add Voice Profile Validation**: Create a migration or startup check to ensure all referenced voice profiles exist.

3. **Persona Tuning Matrix**: As mentioned in the original spec, create a centralized persona tuning matrix for per-coach, per-emotion, per-context voice styles.

4. **Incremental Type Safety**: Gradually replace remaining `any` types with proper types, starting with voice-related code.

5. **Analytics**: Build dashboard or API endpoint to view voice switch events and analyze effectiveness.

## Conclusion

The voice system is now more stable, predictable, and aligned across all components. Voice keys are consistent, error handling is improved, and the architecture is well-documented. The system should feel more reliable and polished for users.



