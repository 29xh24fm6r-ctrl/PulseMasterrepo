// "Meet Pulse" Script Generator
// lib/meet_pulse/scripts.ts

import { callAIJson } from '@/lib/ai/call';
import { BirthExperienceContext, IntroStep } from './types';
import { buildAggregatedBrainContext } from '../agi_kernel/v2/context_aggregate';
import { MEET_PULSE_SCRIPT_PROMPT } from './prompts';

export async function buildMeetPulseScript(
  userId: string,
  ctx: BirthExperienceContext
): Promise<{ steps: IntroStep[]; narrativeIntro: string }> {
  const brainContext = await buildAggregatedBrainContext(userId, ctx.now);

  const result = await callAIJson<{
    script: {
      narrativeIntro: string;
      steps: IntroStep[];
    };
  }>({
    userId,
    feature: 'meet_pulse_script',
    systemPrompt: MEET_PULSE_SCRIPT_PROMPT,
    userPrompt: JSON.stringify({
      brainContext,
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Meet Pulse] Failed to generate script', result.error);
    // Return default script
    return {
      narrativeIntro: "Hello. I'm Pulse. I'm here to help you navigate your life with intelligence, care, and respect for your autonomy.",
      steps: [
        {
          id: 'intro',
          type: 'narrative',
          title: 'Welcome',
          body: "I'm designed to understand your patterns, protect what matters, and help you make better decisions. You're always in control.",
        },
      ],
    };
  }

  return {
    steps: result.data.script.steps ?? [],
    narrativeIntro: result.data.script.narrativeIntro ?? '',
  };
}


