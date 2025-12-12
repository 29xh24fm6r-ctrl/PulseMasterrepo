// Mythic Coach Engine v1 - Response Generator
// lib/mythic/coach/generate.ts

import { callAI } from '@/lib/ai/call';
import { buildMythicContext } from './context';
import { selectPlaybooks } from './playbook_engine';
import { getMythicCoachSettings } from './settings';
import { MythicCoachMode, MythicPlaybook } from './types';

export async function generateMythicCoachResponse(params: {
  userId: string;
  mode: MythicCoachMode;
  userMessage?: string;
  dealId?: string;
}): Promise<{
  response: string;
  usedPlaybooks: MythicPlaybook[];
  lifeChapterId?: string;
  dominantArchetypeId?: string;
  dealArchetypeRunId?: string;
}> {
  const { userId, mode, userMessage, dealId } = params;

  // Build context
  const context = await buildMythicContext({ userId, dealId });

  // Determine situation from mode
  const situationMap: Record<MythicCoachMode, 'deal' | 'habit' | 'weekly_plan' | 'crisis'> = {
    ad_hoc: 'weekly_plan',
    daily_ritual: 'weekly_plan',
    deal_review: 'deal',
    crisis: 'crisis',
  };

  const situation = situationMap[mode];

  // Select playbooks
  const playbooks = await selectPlaybooks({ context, situation });

  // Get user settings
  const settings = await getMythicCoachSettings(userId);

  // Build prompt
  const chapterInfo = context.currentChapter
    ? `Current Chapter: "${context.currentChapter.chapter_name}"\n${context.currentChapter.lesson ? `Lesson: ${context.currentChapter.lesson}` : ''}`
    : 'No active chapter identified.';

  const archetypeInfo = context.mythicProfile?.dominant_life_archetypes
    ? `Dominant Archetypes: ${context.mythicProfile.dominant_life_archetypes.map((a: any) => a.archetype_id).join(', ')}`
    : 'No dominant archetypes identified.';

  const dealInfo = context.activeDeals[0]?.archetype_run
    ? `Deal Archetype: ${context.activeDeals[0].archetype_run.archetype_id}`
    : '';

  const playbookInfo = playbooks
    .map((pb) => `- ${pb.name}: ${pb.description}`)
    .join('\n');

  const toneInstructions: Record<string, string> = {
    grounded: 'Use grounded, practical language. Be mythic but not flowery.',
    epic: 'Use more elevated, epic language. Paint a larger picture.',
    playful: 'Use lighter, more playful language. Make it fun but still meaningful.',
  };

  const intensityInstructions: Record<string, string> = {
    soft: 'Be gentle and supportive. Soft encouragement.',
    medium: 'Be balanced—supportive but direct.',
    warrior: 'Be strong and direct. Push them forward with conviction.',
  };

  const systemPrompt = `You are the Mythic Coach for Pulse. You help users understand their life as a story and make decisions through that lens.

Guidelines:
- ${toneInstructions[settings.tone]}
- ${intensityInstructions[settings.intensity]}
- No cringe, grounded mythic language
- Always tie advice to where they are in their story
- Reference the next clear action that advances the chapter
- For deals: reference archetype conflict and counterplay explicitly
- Keep responses to 1-3 short paragraphs max
- Include 2-4 concrete moves as bullets
- Optional: end with a "hero line" - a single sentence reframing

Available Playbooks (use as inspiration, not word-for-word):
${playbookInfo}`;

  const userPrompt = `${chapterInfo}\n\n${archetypeInfo}\n\n${dealInfo ? `${dealInfo}\n\n` : ''}${userMessage ? `User Message: ${userMessage}\n\n` : ''}Mode: ${mode}\n\nGenerate your coaching response now.`;

  const result = await callAI({
    userId,
    feature: 'mythic_coach_response',
    systemPrompt,
    userPrompt,
    maxTokens: settings.session_length === 'deep' ? 1000 : settings.session_length === 'short' ? 600 : 300,
    temperature: 0.8,
  });

  if (!result.success || !result.text) {
    throw new Error(`Failed to generate response: ${result.error}`);
  }

  return {
    response: result.text,
    usedPlaybooks: playbooks,
    lifeChapterId: context.currentChapter?.id,
    dominantArchetypeId: context.mythicProfile?.dominant_life_archetypes?.[0]?.archetype_id,
    dealArchetypeRunId: context.activeDeals[0]?.archetype_run?.id,
  };
}


