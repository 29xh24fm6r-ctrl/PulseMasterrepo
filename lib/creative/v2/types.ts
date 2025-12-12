// Creative Cortex v2 Types
// lib/creative/v2/types.ts

export interface CreativeSessionContext {
  topic: string;
  goal?: string;
  domain?: string;
  mode?: string;
  workspaceThread?: any;
  destinyContext?: any;
  timelineContext?: any;
  cultureContexts?: any[];
  emotionState?: any;
  somaticState?: any;
}

export interface CreativeIdeaBlueprint {
  title: string;
  description: string;
  category?: string;
  tags?: string[];
  rawPayload?: any;
  scoreOverall: number;
  scoreAlignment?: number;
  scoreImpact?: number;
  scoreFeasibility?: number;
  scoreEnergyFit?: number;
}

export interface CreativeArtifactBlueprint {
  ideaId?: string;
  kind: string;
  title: string;
  content: any;
}


