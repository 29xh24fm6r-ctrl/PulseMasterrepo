# Pulse Brain Blueprint - Canonical Architecture

## Overview

The Pulse Brain is the master architecture that unifies all systems into a coherent "personal mind extension." Every feature is either a brain region or a frontier subsystem.

## Brain Regions

### Core Regions (Implemented)
- **Brainstem Kernel** – Life loop, health, jobs, safety
- **Hippocampus** – Memory integration + consolidation (Third Brain Graph v4)
- **Third Brain** – External knowledge graph / notes / docs
- **Limbic System** – Emotion OS, motivation, salience
- **Neocortex** – Pattern abstraction, skills, predictions (v1 implemented)
- **Cerebellum** – Autopilot, campaigns, procedural routines
- **Prefrontal Cortex** – Planning, prioritization, daily/weekly plans
- **AGI Kernel** – LLM + tools + multi-agent control

### New Regions (Planned)
- **Conscious Workspace** – Global attention and "what's on the mental whiteboard right now"
- **Social** – Relationship intelligence, Theory of Mind
- **Ethnographic** – Cultural and contextual awareness

## Frontier Systems (12 Magic Systems)

All 12 systems are registered in the Brain Registry and tracked by status:

1. **Global Conscious Workspace** (`global_workspace`) - Status: `planned`
   - Region: `workspace`
   - Tracks active focus, conflicts, open loops

2. **Emotional Mirroring & Resonance** (`emotional_resonance`) - Status: `planned`
   - Region: `limbic`
   - Adapts tone, pacing, coach persona to match emotional state

3. **Somatic Loop** (`somatic_loop`) - Status: `planned`
   - Region: `limbic`
   - Models energy, fatigue, circadian rhythms

4. **Narrative Intelligence** (`narrative_intelligence`) - Status: `planned`
   - Region: `hippocampus`
   - Tracks life chapters, themes, identity arcs

5. **Desire Modeling** (`desire_model`) - Status: `planned`
   - Region: `limbic`
   - Learns true preferences, reward patterns

6. **Theory of Mind** (`theory_of_mind`) - Status: `planned`
   - Region: `social`
   - Builds mental models of key people

7. **Creative Cortex** (`creative_cortex`) - Status: `partial` (via Neocortex v1)
   - Region: `neocortex`
   - Generates new ideas, workflows, strategies

8. **Ethical Compass** (`ethical_compass`) - Status: `planned`
   - Region: `prefrontal`
   - Keeps decisions aligned with values

9. **Compression & Abstraction** (`meta_learning`) - Status: `partial` (via Neocortex v1)
   - Region: `hippocampus`
   - Converts experience into heuristics

10. **Behavioral Prediction** (`behavior_prediction`) - Status: `partial` (via Neocortex v1)
    - Region: `neocortex`
    - Forecasts likely behaviors and risks

11. **Social Graph Intelligence** (`social_graph_intel`) - Status: `planned`
    - Region: `social`
    - Maintains relationship health map

12. **Ethnographic Intelligence** (`ethnographic_intel`) - Status: `planned`
    - Region: `ethnographic`
    - Understands cultures, norms, contexts

## Implementation Status

### ✅ Completed
- Brain Registry database (`brain_subsystems` table)
- TypeScript registry with all 12 subsystems defined
- Helper functions for subsystem management
- Brainstem integration (daily loop)
- User creation integration
- API endpoint for querying subsystems

### 🚧 Partial
- **Neocortex v1** → Activates:
  - `behavior_prediction` (partial)
  - `meta_learning` (partial)
  - `creative_cortex` (partial)

### 📋 Planned
- All other frontier systems start as `planned`
- Status updates as systems are implemented

## Files Created

### Database
- `supabase/migrations/20260120_brain_subsystems_v1.sql`

### Core Modules
- `lib/brain/registry.ts` - Registry definitions and helpers
- `lib/brain/brainstem.ts` - Daily brain loop

### API
- `app/api/brain/subsystems/route.ts` - Query subsystems

### Integration
- Updated `lib/services/profile.ts` - Initialize brain on user creation
- Updated `app/api/cron/pulse/route.ts` - Run brainstem loop daily

## Usage

### Query Subsystems
```typescript
// Get all subsystems
GET /api/brain/subsystems

// Get by region
GET /api/brain/subsystems?region=neocortex

// Get active only
GET /api/brain/subsystems?activeOnly=true
```

### Update Subsystem Status
```typescript
import { updateSubsystemStatus } from '@/lib/brain/registry';

// When implementing a new system
await updateSubsystemStatus(userId, 'global_workspace', 'partial', 'v1');
```

### Initialize Brain for New User
```typescript
import { initializeBrainForUser } from '@/lib/brain/brainstem';

// Called automatically on profile creation
await initializeBrainForUser(userId);
```

## Roadmap Tagging

As we implement each sprint, we update subsystem statuses:

- **Neocortex v1** ✅ → `behavior_prediction`, `meta_learning`, `creative_cortex` = `partial`
- **Conscious Workspace v1** → `global_workspace` = `partial`
- **Emotion Mirroring v1** → `emotional_resonance` = `partial`
- **Narrative Engine v1** → `narrative_intelligence` = `partial`
- **Somatic Loop v1** → `somatic_loop` = `partial`
- **Social Graph v1** → `social_graph_intel`, `theory_of_mind` = `partial`
- **Ethnographic v1** → `ethnographic_intel` = `partial`
- **Values & Guardrails v1** → `ethical_compass` = `partial`

## Architecture Philosophy

> "This is not an app. This is *my* mind extension, learning and evolving with me."

Every feature of Pulse is under the brain:
- UI pulls from Conscious Workspace + Prefrontal
- Automations from Cerebellum + Neocortex
- Coaches speak through Limbic + Narrative + Desire Model + Ethical Compass

The Brain Registry ensures Pulse itself knows which pieces are online, enabling:
- Progressive feature rollout
- User-visible "mind extension maturity map"
- Dependency tracking between systems
- Status monitoring and health checks


