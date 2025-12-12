# Pulse Realm Engine v1 - Architecture Documentation

## Overview

The Pulse Realm Engine is a spatial, generative, intent-driven interface system that replaces card-based UI with 3D semantic nodes and living realms.

## Core Architecture

### 1. Node Engine (`lib/realms/node-engine/`)

Converts system outputs (focus, emotion, XP, tasks, etc.) into **3D semantic nodes** with:
- **Metadata**: ID, type, label, value, timestamps
- **Behavior**: pulse, rotate, float, glow, scale
- **Interaction**: onClick, onHover, onFocus handlers
- **Signals**: idle, active, urgent, complete, warning

**Key Files:**
- `types.ts` - Node type definitions
- `node-builder.ts` - Factory functions to create nodes from data

### 2. Realm Engine (`lib/realms/realm-engine/`)

Each Pulse section becomes a **3D realm** with:
- **Camera Config**: Position, target, FOV, auto-rotate
- **Atmosphere**: Fog, lighting, colors
- **Rules**: Node spacing, clustering, physics
- **State**: Nodes, clusters, active/hovered nodes

**Key Files:**
- `types.ts` - Realm type definitions
- `realm-builder.ts` - Constructs realm states from configs

### 3. Intent Engine (`lib/realms/intent-engine/`)

Processes voice/text commands to:
- Navigate realms
- Focus nodes
- Create nodes
- Transform realm appearance
- Filter/cluster nodes
- Show/hide overlays

**Key Files:**
- `types.ts` - Intent type definitions
- `intent-classifier.ts` - Classifies natural language into actions

### 4. Generative UI Layer (`lib/realms/generative-ui/`)

Contextual overlays that appear **only on interaction**:
- Detail overlays (node info)
- Action overlays (buttons/CTAs)
- Insight overlays (messages)
- Warning overlays (alerts)

**Key Files:**
- `types.ts` - Overlay type definitions
- `overlay-manager.ts` - Singleton manager for overlays

### 5. Cockpit Layer (`lib/realms/cockpit/`)

Minimal contextual widgets:
- Status widgets
- Quick actions
- Indicators
- Notifications

**Key Files:**
- `types.ts` - Widget type definitions
- `cockpit-manager.ts` - Singleton manager for widgets

## Components

### 3D Components (`components/nodes/`, `components/realm/`)

- **SemanticNode3D**: Renders a single node in 3D space
- **NodeCluster3D**: Renders a cluster of nodes
- **RealmScene3D**: Main 3D scene container
- **RealmEngine**: Orchestrates the entire realm
- **GenerativeOverlay**: Renders contextual overlays
- **CockpitWidgets**: Renders minimal widgets

## Usage Example

```tsx
import { RealmEngine } from "@/components/realm";

function LifeRealmPage() {
  const { user } = useUser();
  
  return (
    <RealmEngine
      realmId="life"
      userId={user?.id || ""}
      onIntent={(intent) => {
        console.log("Intent:", intent);
      }}
    />
  );
}
```

## Integration with Existing Life Realm

To integrate the Realm Engine into `/life`:

1. Replace `LifeCockpit` with `RealmEngine`
2. Remove old card-based components
3. Use intent engine for voice/text commands
4. Overlays appear automatically on node interaction

## Next Steps

- Add physics simulation for node movement
- Implement node clustering algorithms
- Add voice input integration
- Create realm-specific node generators
- Add animation transitions between realms



