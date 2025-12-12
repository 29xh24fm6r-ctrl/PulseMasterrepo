// Creative Cortex v2 - Types
// lib/creative/types.ts

export type CreativeProjectKind = 'writing' | 'product' | 'strategy' | 'content' | 'design' | 'other';

export type CreativeProjectStatus = 'active' | 'paused' | 'completed' | 'archived';

export type CreativeSessionMode = 'brainstorm' | 'drafting' | 'refinement' | 'problem_solving' | 'ideation';

export type CreativeAssetKind = 'text' | 'outline' | 'plan' | 'idea_list' | 'prompt' | 'spec' | 'story' | 'email' | 'slide_bullets' | 'tweet_thread';

export interface CreativeProject {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  kind: CreativeProjectKind;
  status: CreativeProjectStatus;
  related_node_id: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface CreativeSession {
  id: string;
  user_id: string;
  project_id: string | null;
  started_at: string;
  completed_at: string | null;
  mode: CreativeSessionMode;
  prompt: string | null;
  context_summary: string | null;
  output_summary: string | null;
  created_assets: any | null;
  created_at: string;
}

export interface CreativeAsset {
  id: string;
  user_id: string;
  project_id: string | null;
  session_id: string | null;
  kind: CreativeAssetKind;
  title: string | null;
  content: string;
  metadata: any | null;
  related_node_id: string | null;
  created_at: string;
}

export interface CreativeStyleProfile {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  tone: string | null;
  constraints: any | null;
  examples: any | null;
  is_default: boolean;
  created_at: string;
}


