// What-If Replay Mode v1 - Types
// lib/what_if_replay/v1/types.ts

export type WhatIfMode = 'retro' | 'prospective';

export interface WhatIfScenarioInput {
  label: string;
  description?: string;
  originType: 'council_session' | 'dossier' | 'manual';
  originId?: string | null;
  anchorTime?: string | null;
  timescale?: string | null;
  baseAssumption: string;
  alternateAssumption: string;
  parameters?: any;
}

export interface WhatIfSimulationContext {
  now: string;
  userId: string;

  scenario: {
    label: string;
    baseAssumption: string;
    alternateAssumption: string;
    horizon: string;
    mode: WhatIfMode;
    anchorTime?: string | null;
  };

  destinySnapshot?: any;
  timelineSnapshots?: any[];
  narrativeSnapshot?: any;
  identitySnapshot?: any;
  financialState?: any;
  healthState?: any;
  relationshipState?: any[];
  ethnographicProfiles?: any[];
}


