// Meet Pulse Types
// lib/meet_pulse/types.ts

export interface BirthExperienceContext {
  userId: string;
  now: Date;
}

export interface IntroStep {
  id: string;
  type: 'narrative' | 'question' | 'preference_choice' | 'explanation';
  title: string;
  body: string;
  options?: Array<{
    key: string;
    label: string;
    description?: string;
  }>;
}


