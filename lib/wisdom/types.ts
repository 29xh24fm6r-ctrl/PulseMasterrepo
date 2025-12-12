// Meta-Learning & Wisdom Engine Types
// lib/wisdom/types.ts

export interface ExperienceContext {
  emotion?: any;
  somatic?: any;
  narrative?: any;
  workspace?: any;
  social?: any;
  identity?: any;
}

export interface ExperienceEventInput {
  userId: string;
  source: string;
  kind: string;
  refType?: string;
  refId?: string;
  description: string;
  context?: ExperienceContext;
  expectation?: any;
  outcome?: any;
  evaluation?: {
    successScore?: number;        // 0-1
    alignmentDelta?: number;      // change in value alignment, -1..1
    notes?: string;
  };
}

export interface WisdomLesson {
  id?: string;
  userId: string;
  status: 'active' | 'deprecated';
  scope: 'personal' | 'shared_template';
  domain?: string | null;
  title: string;
  summary?: string;
  condition: any;
  recommendation: any;
  avoid?: any;
  evidence?: any;
  strength: number;
  usefulness: number;
}

export interface PersonalHeuristic {
  id?: string;
  userId: string;
  key: string;
  description: string;
  domain?: string | null;
  rule: any;
  strength: number;
}

export interface WisdomPlaybook {
  id?: string;
  userId: string;
  key: string;
  name: string;
  description?: string;
  domain?: string | null;
  triggerPattern: any;
  lessonIds: string[];
  heuristicIds: string[];
}


