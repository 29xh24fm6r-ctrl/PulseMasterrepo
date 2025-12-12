# Mythic Coach Voice Persona v1 + Mythic Dojo v1

## Implementation Status

✅ **COMPLETE** - Both modules fully implemented:

### Mythic Coach Voice Persona v1
- ✅ Database migration (mythic_voice_mappings)
- ✅ Voice profile seeding (Mythic Sage, Battle Mentor, Shadow Mirror)
- ✅ Voice selector logic
- ✅ Voice strategy integration
- ✅ API endpoint (voice preview)
- ✅ Brain Registry integration

### Mythic Dojo v1
- ✅ Database migrations (3 tables: mythic_belt_levels, mythic_belt_progress, mythic_achievements)
- ✅ Belt ladder seeding (8 belts per archetype)
- ✅ Belt progress system
- ✅ Achievements system
- ✅ API endpoints (dashboard, archetype detail, mission completion)
- ✅ Mission completion hooks
- ✅ Brain Registry integration

---

## Files Created

### Mythic Coach Voice Persona
- `supabase/migrations/20260120_mythic_coach_voice_persona_v1.sql` - Creates mythic_voice_mappings + seeds voice profiles
- `lib/mythic_coach/voice/selector.ts` - Voice profile selector
- `lib/mythic_coach/voice/strategy.ts` - Voice strategy integration
- `app/api/mythic-coach/voice/preview/route.ts` - Voice preview API

### Mythic Dojo
- `supabase/migrations/20260120_mythic_dojo_v1.sql` - Creates 3 tables + seeds belt ladders
- `lib/mythic_dojo/v1/belt_table.ts` - Belt ladder helpers
- `lib/mythic_dojo/v1/progress.ts` - XP and belt progress system
- `lib/mythic_dojo/v1/achievements.ts` - Achievement evaluation
- `app/api/mythic-dojo/dashboard/route.ts` - Dashboard API
- `app/api/mythic-dojo/archetype/[id]/route.ts` - Archetype detail API
- `app/api/mythic-dojo/mission/complete/route.ts` - Mission completion API

### Integration
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added `mythic_coach_voice_persona_v1` and `mythic_dojo_v1` to `brain_subsystems`

---

## PART A – Mythic Coach Voice Persona v1

### Purpose
Dedicated voice persona for archetype-based coaching that adapts tone based on:
- Current chapter (Life Canon)
- Dominant archetypes
- Emotional state (Emotion OS)
- Coaching context (gentle vs drill-sergeant vs wise elder)

### Voice Profiles Seeded

1. **Mythic Sage** - Calm, wise, archetype-oriented mentor
   - Tone: warm, pace: medium-slow, energy: low, directness: soft
   - Default for most archetypes

2. **Battle Mentor** - High-energy, focused, tactical
   - Tone: confident, pace: medium-fast, energy: high, directness: direct
   - Mapped to Warrior archetype

3. **Shadow Mirror** - Quiet, reflective, for shadow work
   - Tone: neutral, pace: slow, energy: low, directness: gentle
   - For difficult reflections

### Voice Selection Logic

1. **User-specific mappings** - Check for user customizations first
2. **System archetype mappings** - Check archetype-specific defaults
3. **System default** - Fall back to Mythic Sage

Selection considers:
- `archetypeId` - Which archetype is being trained
- `mode` - grow, stabilize, or cool
- `intensityHint` - soft, balanced, or intense (derived from emotional state)

### Integration

`getMythicCoachVoiceForSession()`:
- Fetches latest archetype snapshot
- Fetches latest emotion state
- Determines emotional load (stressed, calm, overwhelmed, hyped)
- Selects appropriate voice profile

### API Endpoints

#### GET /api/mythic-coach/voice/preview
Returns which voice would be used right now:
```json
{
  "voiceProfileId": "uuid-or-null",
  "styleOverrides": {...},
  "archetypeContext": {...},
  "emotionContext": {...}
}
```

---

## PART B – Mythic Dojo v1

### Purpose
Gamified dojo layer for archetype training with:
- Belts / ranks per archetype
- XP, streaks, training arcs
- Visual progress ("Builder: Blue Belt, 65% → Purple")
- Integrates Mythic Coach missions + reflections

### Belt System

**8 Belt Ranks:**
1. White (0 XP)
2. Yellow (50 XP)
3. Orange (150 XP)
4. Green (300 XP)
5. Blue (500 XP)
6. Purple (750 XP)
7. Brown (1000 XP)
8. Black (1500 XP)

Each archetype has its own belt ladder with the same progression.

### Progress Tracking

Per archetype:
- **current_xp** - Total XP earned
- **current_belt_rank** - Current belt (1-8)
- **streak_days** - Consecutive days of training
- **total_missions_completed** - Total missions done
- **last_promotion_at** - When last belt was earned

### Achievements

Achievements unlocked at:
- **MYTHIC_50_XP** - First 50 XP
- **MYTHIC_100_XP** - Century (100 XP)
- **MYTHIC_ORANGE_BELT** - Orange Belt (rank 3)
- **MYTHIC_BLUE_BELT** - Blue Belt (rank 5)
- **MYTHIC_7_DAY_STREAK** - 7-day streak
- **MYTHIC_30_DAY_STREAK** - 30-day streak

### Mission Completion Flow

When a mission is completed:
1. Update mission status to 'completed'
2. Call `awardMythicXpForMission()`:
   - Add XP to archetype progress
   - Update streak (increment if consecutive, reset if gap)
   - Check for belt promotion
3. Call `evaluateMythicAchievements()`:
   - Check if any achievements should be unlocked
   - Insert new achievements

### API Endpoints

#### GET /api/mythic-dojo/dashboard
Returns dashboard overview:
```json
{
  "beltProgress": [
    {
      "archetypeId": "builder",
      "currentXp": 240,
      "currentBeltRank": 3,
      "beltName": "Blue",
      "streakDays": 5
    }
  ],
  "activePlans": [...],
  "upcomingMissions": [...],
  "recentAchievements": [...]
}
```

#### GET /api/mythic-dojo/archetype/:id
Returns archetype detail:
```json
{
  "archetype": {...},
  "beltProgress": {...},
  "beltLadder": [...],
  "plans": [...],
  "missions": [...],
  "achievements": [...]
}
```

#### POST /api/mythic-dojo/mission/complete
Completes a mission and awards XP:
```json
{
  "missionId": "uuid",
  "completionNotes": "optional"
}
```

**Response:**
```json
{
  "success": true,
  "progress": {
    "currentXp": 250,
    "currentBeltRank": 3,
    "streakDays": 6
  },
  "newAchievements": [...]
}
```

---

## Next Steps

### Frontend UI

#### Mythic Dojo Pages
- `/app/mythic-dojo/page.tsx` - Dojo home
  - Archetype grid with belt progress
  - Today's missions
  - Recent achievements
- `/app/mythic-dojo/archetype/[archetypeId]/page.tsx` - Archetype detail
  - Belt ladder visualization
  - Active plans & missions
  - Achievements panel

#### Components
- `MythicArchetypeCard` - Archetype card with belt/XP
- `BeltLadder` - Visual belt progression
- `MythicMissionList` - Mission list with completion
- `AchievementBadge` - Achievement display

### Voice Integration
- Integrate voice selection into Mythic Coach conversations
- Voice preview UI in Mythic Coach settings
- Voice customization per archetype

### Enhancements
- **Mythic Story Sessions** - Voice-guided sessions through life chapters
- **Deal Archetype Lens** - See which archetypes drive business moves
- **Belt Ceremonies** - Special UI/voice moment when belt is earned
- **Archetype Battles** - Compare archetype progress across different areas

---

## Impact

Pulse now has:

1. **Consistent Mythic Voice** - Same mentor voice that adapts to your archetypes and mood
2. **Gamified Training** - Belts, XP, streaks make archetype training tangible
3. **Visual Progress** - See exactly where you are in each archetype's journey
4. **Achievement System** - Unlock badges as you progress
5. **Mission Integration** - Missions automatically award XP and track progress

This is the moment archetype training becomes **tangible, gamified, and voice-enabled** - turning abstract insights into concrete, trackable growth.

🧙‍♂️🎮✨


