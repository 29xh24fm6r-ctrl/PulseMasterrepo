// Global Conscious Workspace v3 Types
// lib/conscious_workspace/v3/types.ts

export interface ConsciousItemBlueprint {
  sourceSubsystem: string;
  kind: string;
  title: string;
  description?: string;
  payload?: any;
  domain?: string;
  tags?: string[];
  urgency: number;
  importance: number;
  emotionalSalience: number;
}

export interface ConsciousFrameContext {
  triggerKind: string;
  triggerSource: string;
  triggerReference?: any;

  // Aggregated inputs from subsystems
  timelineContext?: any;
  destinyContext?: any;
  narrativeContext?: any;
  selfMirrorSnapshot?: any;
  emotionState?: any;
  somaticState?: any;
  socialState?: any;
  risks?: any[];
  opportunities?: any[];
  activeWorkspaceThreads?: any[];
}


