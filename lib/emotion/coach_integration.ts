// Emotional Resonance - Coach Integration
// lib/emotion/coach_integration.ts

import { selectResponseStyleForContext, getResponseStyleProfile } from './resonance';
import { ResponseStyleContext } from './resonance';

/**
 * Get response style context for a coach interaction
 * This can be injected into coach system prompts
 */
export async function getResponseStyleForCoach(params: {
  userId: string;
  coach?: string;
  channel?: 'chat' | 'voice' | 'notification';
  date?: Date;
}): Promise<{ styleKey: string; styleProfile: any }> {
  const styleKey = await selectResponseStyleForContext({
    userId: params.userId,
    date: params.date,
    context: {
      channel: params.channel || 'chat',
      coach: params.coach,
    },
  });

  const styleProfile = await getResponseStyleProfile(styleKey);

  return {
    styleKey,
    styleProfile: styleProfile || null,
  };
}

/**
 * Build response style instructions for coach prompts
 */
export function buildResponseStyleInstructions(styleProfile: any): string {
  if (!styleProfile) return '';

  const style = styleProfile.speaking_style || {};
  
  return `
RESPONSE STYLE: ${styleProfile.name}
- Tone: ${style.tone || 'neutral'}
- Pacing: ${style.pacing || 'normal'}
- Word Choice: ${style.word_choice || 'clear'}
- Energy Level: ${style.energy || 'medium'}

${styleProfile.description || ''}

Adapt your responses to match this style.`;
}


