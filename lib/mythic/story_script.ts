// Mythic Intelligence Layer v1 - Story Script Generator
// lib/mythic/story_script.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAI } from '@/lib/ai/call';
import { StoryFramework, SessionType, LifeChapter } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function generateMythicSessionScript(params: {
  userId: string;
  sessionType: SessionType;
  framework: StoryFramework;
  focusChapterId?: string;
}): Promise<{ script: string; ssml: string }> {
  const dbUserId = await resolveUserId(params.userId);

  // Gather context
  const [chaptersRes, profileRes, identityRes, destinyRes] = await Promise.all([
    supabaseAdmin
      .from('life_chapters')
      .select('*, mythic_archetypes(*)')
      .eq('user_id', dbUserId)
      .order('timeframe_start', { ascending: false })
      .limit(10),
    supabaseAdmin
      .from('user_mythic_profile')
      .select('*')
      .eq('user_id', dbUserId)
      .maybeSingle(),
    supabaseAdmin
      .from('identity_snapshots')
      .select('*')
      .eq('user_id', dbUserId)
      .order('snapshot_time', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('destiny_arcs')
      .select('*')
      .eq('user_id', dbUserId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const chapters = chaptersRes.data ?? [];
  const profile = profileRes.data;
  const identity = identityRes.data;
  const destiny = destinyRes.data;

  const focusChapter = params.focusChapterId
    ? chapters.find((c: any) => c.id === params.focusChapterId)
    : chapters.find((c: any) => c.status === 'active') ?? chapters[0];

  // Build framework-specific prompt
  const frameworkPrompts: Record<StoryFramework, string> = {
    heros_journey: `Follow the classic Hero's Journey structure: Call to Adventure, Refusal, Meeting the Mentor, Crossing the Threshold, Tests/Allies/Enemies, Approach to Inmost Cave, Ordeal, Reward, Road Back, Resurrection, Return with Elixir.`,
    samurai_path: `Follow the Samurai path: Discipline, Honor, Service, Mastery, Acceptance of Death, Legacy.`,
    stoic_trials: `Follow Stoic principles: Acceptance, Virtue, Duty, Resilience, Wisdom, Inner Peace.`,
    phoenix_cycle: `Follow the Phoenix cycle: Death/Burnout, Ashes/Recovery, Rebirth, Rising, Transformation.`,
  };

  const sessionTypePrompts: Record<SessionType, string> = {
    origin_story: `Tell the origin story - where did this journey begin? What was the call?`,
    dark_forest: `Explore the dark forest - the challenges, trials, and moments of doubt.`,
    rebirth: `Focus on transformation and rebirth - how did you rise from the ashes?`,
    destiny_path: `Map the destiny path - where is this journey leading? What is the ultimate goal?`,
    integration: `Integrate the lessons - how do all the pieces fit together? What wisdom have you gained?`,
  };

  const prompt = `You are the Mythic Storyteller for Pulse. Generate a voice script for a ${params.sessionType} session using the ${params.framework} framework.

${frameworkPrompts[params.framework]}

${sessionTypePrompts[params.sessionType]}

Guidelines:
- Write in second person ("You...")
- Use mythic language without being cringe
- Insert reflection questions marked with [[REFLECTION:question text]]
- Keep it conversational and personal
- Reference specific events and chapters naturally
- End with a call to action or next step

Context:
- Current Chapter: ${focusChapter?.chapter_name ?? 'Unknown'}
- Dominant Archetypes: ${profile?.dominant_life_archetypes?.map((a: any) => a.archetype_id).join(', ') ?? 'None'}
- Recurring Motifs: ${profile?.recurring_motifs?.join(', ') ?? 'None'}
- Identity: ${identity ? JSON.stringify(identity, null, 2) : 'Not available'}
- Destiny: ${destiny ? JSON.stringify(destiny, null, 2) : 'Not available'}

Generate the script now.`;

  const result = await callAI({
    userId: params.userId,
    feature: 'mythic_session_script',
    systemPrompt: `You are a master storyteller who weaves personal narratives into mythic frameworks. You speak directly to the user, using "you" throughout. You are wise but not preachy, poetic but not flowery.`,
    userPrompt: prompt,
    maxTokens: 3000,
    temperature: 0.8,
  });

  if (!result.success || !result.text) {
    throw new Error(`Failed to generate script: ${result.error}`);
  }

  const script = result.text;

  // Convert script to SSML (simple conversion - add pauses at reflection markers)
  const ssml = script
    .replace(/\[\[REFLECTION:(.*?)\]\]/g, '<break time="2s"/>$1<break time="3s"/>')
    .replace(/\. /g, '. <break time="0.5s"/>')
    .replace(/\? /g, '? <break time="1s"/>')
    .replace(/\! /g, '! <break time="0.8s"/>');

  return { script, ssml };
}


