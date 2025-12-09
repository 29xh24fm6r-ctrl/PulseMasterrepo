/**
 * Identity Onboarding Quiz
 * ========================
 * 
 * Questions designed to discover archetype resonance and core values.
 */

import { ArchetypeId, ValueId } from './types';

export interface QuizQuestion {
  id: string;
  text: string;
  subtext?: string;
  options: QuizOption[];
}

export interface QuizOption {
  id: string;
  text: string;
  archetypes: Partial<Record<ArchetypeId, number>>; // Points per archetype
  values: Partial<Record<ValueId, number>>; // Points per value
}

export interface QuizResults {
  archetypeScores: Record<ArchetypeId, number>;
  valueScores: Record<ValueId, number>;
  topArchetypes: { id: ArchetypeId; score: number }[];
  topValues: { id: ValueId; score: number }[];
  primaryArchetype: ArchetypeId;
  primaryValue: ValueId;
}

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'challenge',
    text: 'When facing a difficult challenge, you typically...',
    options: [
      {
        id: 'a',
        text: 'Stay calm and analyze the situation logically',
        archetypes: { stoic: 3, strategist: 2 },
        values: { discipline: 2, wisdom: 1 },
      },
      {
        id: 'b',
        text: 'Take immediate action and adapt as you go',
        archetypes: { warrior: 3, builder: 2 },
        values: { courage: 2, growth: 1 },
      },
      {
        id: 'c',
        text: 'Seek input from others and collaborate on solutions',
        archetypes: { leader: 3, father: 2 },
        values: { family: 2, impact: 1 },
      },
      {
        id: 'd',
        text: 'Reflect deeply before deciding on the right path',
        archetypes: { monk: 3, scholar: 2 },
        values: { wisdom: 2, presence: 1 },
      },
    ],
  },
  {
    id: 'success',
    text: 'Success to you means...',
    options: [
      {
        id: 'a',
        text: 'Building something lasting that outlives you',
        archetypes: { builder: 3, creator: 2 },
        values: { impact: 2, excellence: 1 },
      },
      {
        id: 'b',
        text: 'Achieving inner peace and self-mastery',
        archetypes: { monk: 3, stoic: 2 },
        values: { presence: 2, discipline: 1 },
      },
      {
        id: 'c',
        text: 'Protecting and providing for those you love',
        archetypes: { father: 3, warrior: 2 },
        values: { family: 2, integrity: 1 },
      },
      {
        id: 'd',
        text: 'Continuous learning and expanding your mind',
        archetypes: { scholar: 3, strategist: 2 },
        values: { growth: 2, wisdom: 1 },
      },
    ],
  },
  {
    id: 'morning',
    text: 'Your ideal morning starts with...',
    options: [
      {
        id: 'a',
        text: 'Meditation or quiet reflection',
        archetypes: { monk: 3, stoic: 2 },
        values: { presence: 2, discipline: 1 },
      },
      {
        id: 'b',
        text: 'Intense physical training',
        archetypes: { warrior: 3, samurai: 2 },
        values: { discipline: 2, excellence: 1 },
      },
      {
        id: 'c',
        text: 'Planning and strategizing for the day',
        archetypes: { strategist: 3, leader: 2 },
        values: { excellence: 2, growth: 1 },
      },
      {
        id: 'd',
        text: 'Creative work when the mind is fresh',
        archetypes: { creator: 3, scholar: 2 },
        values: { freedom: 2, growth: 1 },
      },
    ],
  },
  {
    id: 'conflict',
    text: 'In a conflict, you prioritize...',
    options: [
      {
        id: 'a',
        text: 'Standing firm on your principles',
        archetypes: { samurai: 3, warrior: 2 },
        values: { integrity: 2, courage: 1 },
      },
      {
        id: 'b',
        text: 'Finding a strategic win-win solution',
        archetypes: { strategist: 3, leader: 2 },
        values: { wisdom: 2, impact: 1 },
      },
      {
        id: 'c',
        text: 'Maintaining emotional composure',
        archetypes: { stoic: 3, monk: 2 },
        values: { discipline: 2, presence: 1 },
      },
      {
        id: 'd',
        text: 'Protecting relationships at all costs',
        archetypes: { father: 3, leader: 2 },
        values: { family: 2, integrity: 1 },
      },
    ],
  },
  {
    id: 'legacy',
    text: 'You want to be remembered as someone who...',
    options: [
      {
        id: 'a',
        text: 'Led others to achieve great things',
        archetypes: { leader: 3, strategist: 2 },
        values: { impact: 2, excellence: 1 },
      },
      {
        id: 'b',
        text: 'Created works that inspired people',
        archetypes: { creator: 3, builder: 2 },
        values: { freedom: 2, growth: 1 },
      },
      {
        id: 'c',
        text: 'Lived with honor and discipline',
        archetypes: { samurai: 3, stoic: 2 },
        values: { integrity: 2, discipline: 1 },
      },
      {
        id: 'd',
        text: 'Raised a strong, loving family',
        archetypes: { father: 3, warrior: 2 },
        values: { family: 2, presence: 1 },
      },
    ],
  },
  {
    id: 'fear',
    text: 'Your greatest fear is...',
    options: [
      {
        id: 'a',
        text: 'Losing control of your emotions',
        archetypes: { stoic: 3, monk: 2 },
        values: { discipline: 2, presence: 1 },
      },
      {
        id: 'b',
        text: 'Failing those who depend on you',
        archetypes: { father: 3, leader: 2 },
        values: { family: 2, integrity: 1 },
      },
      {
        id: 'c',
        text: 'Living a life without meaning',
        archetypes: { scholar: 3, creator: 2 },
        values: { wisdom: 2, impact: 1 },
      },
      {
        id: 'd',
        text: 'Not reaching your full potential',
        archetypes: { warrior: 3, builder: 2 },
        values: { growth: 2, excellence: 1 },
      },
    ],
  },
  {
    id: 'energy',
    text: 'You feel most energized when...',
    options: [
      {
        id: 'a',
        text: 'Solving complex problems',
        archetypes: { strategist: 3, scholar: 2 },
        values: { wisdom: 2, growth: 1 },
      },
      {
        id: 'b',
        text: 'Pushing through physical or mental limits',
        archetypes: { warrior: 3, samurai: 2 },
        values: { courage: 2, discipline: 1 },
      },
      {
        id: 'c',
        text: 'Creating something from nothing',
        archetypes: { creator: 3, builder: 2 },
        values: { freedom: 2, excellence: 1 },
      },
      {
        id: 'd',
        text: 'Deep conversations about life and meaning',
        archetypes: { monk: 3, scholar: 2 },
        values: { presence: 2, wisdom: 1 },
      },
    ],
  },
  {
    id: 'decision',
    text: 'When making important decisions, you rely on...',
    options: [
      {
        id: 'a',
        text: 'Data and logical analysis',
        archetypes: { strategist: 3, scholar: 2 },
        values: { wisdom: 2, excellence: 1 },
      },
      {
        id: 'b',
        text: 'Your core principles and values',
        archetypes: { samurai: 3, stoic: 2 },
        values: { integrity: 2, discipline: 1 },
      },
      {
        id: 'c',
        text: 'Intuition and gut feeling',
        archetypes: { creator: 3, warrior: 2 },
        values: { courage: 2, freedom: 1 },
      },
      {
        id: 'd',
        text: 'What\'s best for your loved ones',
        archetypes: { father: 3, leader: 2 },
        values: { family: 2, impact: 1 },
      },
    ],
  },
];

/**
 * Calculate quiz results from answers
 */
export function calculateQuizResults(answers: Record<string, string>): QuizResults {
  const archetypeScores: Record<string, number> = {
    stoic: 0, samurai: 0, builder: 0, father: 0, warrior: 0,
    strategist: 0, leader: 0, creator: 0, scholar: 0, monk: 0,
  };
  
  const valueScores: Record<string, number> = {
    integrity: 0, growth: 0, family: 0, excellence: 0, freedom: 0,
    impact: 0, wisdom: 0, courage: 0, discipline: 0, presence: 0,
  };

  // Tally scores from each answer
  for (const [questionId, optionId] of Object.entries(answers)) {
    const question = QUIZ_QUESTIONS.find(q => q.id === questionId);
    if (!question) continue;

    const option = question.options.find(o => o.id === optionId);
    if (!option) continue;

    // Add archetype scores
    for (const [archetype, score] of Object.entries(option.archetypes)) {
      archetypeScores[archetype] = (archetypeScores[archetype] || 0) + (score || 0);
    }

    // Add value scores
    for (const [value, score] of Object.entries(option.values)) {
      valueScores[value] = (valueScores[value] || 0) + (score || 0);
    }
  }

  // Sort and get top results
  const topArchetypes = Object.entries(archetypeScores)
    .map(([id, score]) => ({ id: id as ArchetypeId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const topValues = Object.entries(valueScores)
    .map(([id, score]) => ({ id: id as ValueId, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return {
    archetypeScores: archetypeScores as Record<ArchetypeId, number>,
    valueScores: valueScores as Record<ValueId, number>,
    topArchetypes,
    topValues,
    primaryArchetype: topArchetypes[0]?.id || 'stoic',
    primaryValue: topValues[0]?.id || 'growth',
  };
}

/**
 * Convert quiz results to initial identity state resonance
 */
export function quizResultsToResonance(results: QuizResults): {
  resonance: Record<ArchetypeId, number>;
  values: Record<ValueId, number>;
} {
  const resonance: Record<string, number> = {};
  const values: Record<string, number> = {};

  // Convert archetype scores to resonance (multiply by 20 for meaningful starting values)
  for (const [id, score] of Object.entries(results.archetypeScores)) {
    resonance[id] = Math.min(400, score * 20); // Cap at 400 to encourage earning activation
  }

  // Convert value scores to values (base 50 + score * 3)
  for (const [id, score] of Object.entries(results.valueScores)) {
    values[id] = Math.min(85, 50 + score * 3); // Start above neutral but not maxed
  }

  return {
    resonance: resonance as Record<ArchetypeId, number>,
    values: values as Record<ValueId, number>,
  };
}
