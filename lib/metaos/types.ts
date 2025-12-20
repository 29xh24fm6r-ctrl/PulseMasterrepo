// MetaOS Types (shared between server and client)
// lib/metaos/types.ts

export interface MetaOSProfile {
  preferredOSStyles: string[];
  preferredCoachModes: string[];
  preferredExperienceModes: string[];
  autoAdjustmentsEnabled: boolean;
}

export interface OSRebuild {
  rebuildType: "full" | "partial" | "theme" | "workflow";
  changes: Record<string, any>;
}

