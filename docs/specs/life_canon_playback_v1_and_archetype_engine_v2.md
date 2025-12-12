# 🎬 Life Canon Playback v1 & 🧙‍♂️ Archetype Engine v2

## Implementation Status

✅ **COMPLETE** - Both modules fully implemented:

### Life Canon Playback v1
- ✅ Backend helpers (`lib/life_canon/v1/playback/`)
- ✅ API endpoints (2 endpoints)
- ✅ Brain Registry integration

### Archetype Engine v2
- ✅ Database migrations (5 tables + seeded archetype definitions)
- ✅ TypeScript types
- ✅ LLM prompts
- ✅ Snapshot system
- ✅ Chapter archetypes system
- ✅ API endpoints (3 endpoints)
- ✅ Strategic Mind integration
- ✅ Brain loop integration
- ✅ Brain Registry integration

---

## Files Created

### Life Canon Playback
- `lib/life_canon/v1/playback/timeline_query.ts` - Timeline query helpers
- `lib/life_canon/v1/playback/chapter_view.ts` - Chapter view helpers
- `lib/life_canon/v1/playback/playback_api.ts` - Playback API helpers
- `app/api/life-canon/playback/overview/route.ts` - Overview API
- `app/api/life-canon/chapter/[id]/playback/route.ts` - Chapter playback API

### Archetype Engine v2
- `supabase/migrations/20260120_archetype_engine_v2.sql` - Creates 5 tables + seeds archetypes
- `lib/archetypes/v2/types.ts` - Type definitions
- `lib/archetypes/v2/prompts.ts` - LLM prompts
- `lib/archetypes/v2/snapshots.ts` - Snapshot builder
- `lib/archetypes/v2/chapter_archetypes.ts` - Chapter archetypes updater
- `app/api/archetypes/snapshot/run/route.ts` - Run snapshot API
- `app/api/archetypes/current/route.ts` - Get current archetypes API
- `app/api/archetypes/chapters/route.ts` - Get chapter archetypes API

### Integration
- Updated `lib/strategic_mind/v1/aggregate_signals.ts`:
  - Added archetype snapshot to Strategic Signal Bundle
- Updated `lib/strategic_mind/v1/types.ts`:
  - Added `archetypeSnapshot` field to `StrategicSignalBundle`
- Updated `lib/brain/brainstem.ts`:
  - Added Archetype Engine refresh to weekly brain loop
- Updated `supabase/migrations/20260120_master_brain_registry_and_diagnostics_v1.sql`:
  - Added `life_canon_playback_v1` and `archetype_engine_v2` to `brain_subsystems`

---

## Life Canon Playback v1

### Purpose
Cinematic story viewer for your Life Canon - the experience layer that lets you:
- Watch your life as a narrative timeline
- Scrub across chapters & events
- See emotional and thematic arcs
- Play back "seasons" of your life
- Jump into Decision Theater / What-If from specific moments

### API Endpoints

#### GET /api/life-canon/playback/overview
Returns complete playback overview:
```json
{
  "snapshot": { ...life_canon_snapshots row },
  "chapters": [ ...life_chapters ],
  "events": [ ...canon_events ],
  "identityTransforms": [ ...identity_transforms ]
}
```

#### GET /api/life-canon/chapter/:id/playback
Returns chapter with full context:
```json
{
  "chapter": { ... },
  "events": [ ... ],
  "identityTransforms": [ ... ]
}
```

### Backend Helpers

- `getLifeTimelineForUser()` - Fetches all chapters, events, and transforms
- `getCurrentCanonSnapshot()` - Gets latest snapshot
- `getChapterWithContext()` - Gets chapter with filtered events and transforms
- `getPlaybackOverview()` - Orchestrates full overview

---

## Archetype Engine v2

### Purpose
Deep mythic model of who you're being - tracks:
- **Dominant archetypes** (Warrior, Builder, King, Sage, etc.)
- How archetypes **shift across chapters**
- Which archetypes are **healthy vs shadow**
- Which archetypes are **underdeveloped but needed**
- How decisions reflect archetype dynamics

### Database Schema

#### archetype_definitions
Global definitions of archetypes (seeded with 12 base archetypes):
- warrior, builder, king, sage, lover, magician, trickster, guardian, creator, rebel, healer, explorer

#### user_archetype_profiles
Overall archetype state per user:
- dominant_archetypes (ordered list with strength, mode)
- suppressed_archetypes
- context_notes

#### chapter_archetypes
Archetype snapshot per chapter:
- archetype_mix
- primary_archetype_id
- notes

#### archetype_events
Moments where archetype energy spiked/shifted:
- archetype_id, mode, intensity
- source, source_id
- linked_canon_event_id

#### archetype_snapshots
Periodic overall snapshot:
- current_mix
- rising_archetypes
- fading_archetypes
- narrative_summary

### API Endpoints

#### POST /api/archetypes/snapshot/run
Triggers archetype snapshot analysis.

#### GET /api/archetypes/current
Returns latest snapshot + profile:
```json
{
  "profile": { ...user_archetype_profiles row },
  "latestSnapshot": { ...archetype_snapshots row }
}
```

#### GET /api/archetypes/chapters
Returns chapters with their archetypes:
```json
{
  "chapters": [
    {
      "chapter": { ...life_chapters row },
      "archetypes": { ...chapter_archetypes row }
    }
  ]
}
```

### Integration Points

#### Strategic Mind
- Archetype snapshot added to `StrategicSignalBundle`
- Strategic Mind can:
  - Avoid strategies that overfeed shadow archetypes
  - Support shifts toward desired archetypes
  - Consider archetype dynamics in recommendations

#### Life Canon
- Each chapter can fetch associated `chapter_archetypes`
- Playback UI can show archetype tags per chapter
- Archetype evolution tracked across chapters

#### Executive Council (Future)
- Can add "Mythic Advisor" view in Decision Theater
- Shows how decisions feed different archetypes
- Warns about shadow archetype spikes

#### Coaches (Future)
- Career coach: "Lean into Builder/Strategist, not just Warrior"
- Relationship coach: "Guardian/Lover needs time; stay out of Shadow Warrior"
- Health coach: "Chronic Over-Warrior; need Restorative Healer patterns"

---

## Brain Integration

### Weekly Brain Loop

Both systems integrated into `runWeeklyBrainLoopForUser`:

1. **Life Canon** (already integrated):
   - Builds current chapter
   - Extracts canon events
   - Detects identity shifts
   - Generates narrative summary

2. **Archetype Engine** (newly integrated):
   - Runs archetype snapshot analysis
   - Updates chapter archetypes
   - Updates user archetype profile

---

## Next Steps

### Life Canon Playback UI
- `/app/life-canon/page.tsx` - Playback overview page
- `/app/life-canon/chapter/[id]/page.tsx` - Chapter deep dive
- Components:
  - `CanonTimeline.tsx` - Timeline visualization
  - `ChapterCard.tsx` - Chapter summary card
  - `CanonEventCard.tsx` - Event card
  - `IdentityShiftCard.tsx` - Identity shift card

### Archetype Engine Enhancements
- Archetype event extraction from canon events
- Archetype-aware coaching recommendations
- Mythic Advisor in Decision Theater
- Archetype visualization in Life Canon Playback

### Mythic Coach UX (Future)
- Front-end where Pulse talks in archetype language
- "Your King is under-trained; let's train him over the next 90 days"
- Tied into XP, missions, Career/Life Dojo

---

## Impact

Pulse now has:

1. **Cinematic Life Story** - Visual timeline of your life chapters and events
2. **Mythic Intelligence** - Understands who you're being through archetypes
3. **Archetype-Aware Strategy** - Strategic Mind considers archetype dynamics
4. **Chapter Archetypes** - Each life chapter has its archetypal signature
5. **Archetype Evolution** - Tracks how archetypes shift over time

This is the moment Pulse becomes **a mythic companion** that understands not just what you do, but **who you're being** - and can guide you toward healthier archetypal expression.

🎬🧙‍♂️✨


