// Voice Route: Memory
// lib/voice/routes/memory.ts

import { findSimilarEmotionEpisodes } from '@/lib/thirdbrain/graph/query';
import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export interface MemoryVoiceResult {
  text: string;
  metadata?: any;
}

export async function handleMemoryVoiceTurn(params: {
  userId: string;
  text: string;
}): Promise<MemoryVoiceResult> {
  const lowerText = params.text.toLowerCase();
  const dbUserId = await resolveUserId(params.userId);

  // "When have I felt this way before?"
  if (lowerText.includes('felt this way') || lowerText.includes('felt like this')) {
    // Get current emotion state
    const { data: currentEmotion } = await supabaseAdmin
      .from('tb_nodes')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('type', 'emotion_state')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (currentEmotion) {
      const similar = await findSimilarEmotionEpisodes(params.userId, currentEmotion.id, 3);
      if (similar.length > 0) {
        return {
          text: `You've had ${similar.length} similar emotional episodes in the past. I can show you what was happening then and what helped. Check your Memory Graph for details.`,
        };
      }
    }
    return {
      text: "I don't see similar past episodes in your memory graph yet. Keep using Pulse and I'll learn your patterns over time.",
    };
  }

  // "What defines this season of my life?"
  if (lowerText.includes('season') || lowerText.includes('chapter') || lowerText.includes('period')) {
    const now = new Date().toISOString().split('T')[0];
    const { data: chapter } = await supabaseAdmin
      .from('tb_chapters')
      .select('*')
      .eq('user_id', dbUserId)
      .lte('period_start', now)
      .gte('period_end', now)
      .order('period_end', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (chapter) {
      return {
        text: `This season is titled "${chapter.title}". ${chapter.summary_md.slice(0, 200)}...`,
      };
    }
    return {
      text: "I haven't generated a chapter for your current period yet. Would you like me to create one?",
    };
  }

  // "What patterns do you see?"
  if (lowerText.includes('patterns') || lowerText.includes('trends')) {
    const { data: chapters } = await supabaseAdmin
      .from('tb_chapters')
      .select('*')
      .eq('user_id', dbUserId)
      .order('period_start', { ascending: false })
      .limit(3);

    if (chapters && chapters.length > 0) {
      const themes = chapters.flatMap((c: any) => c.tags || []).slice(0, 5);
      return {
        text: `I see several themes in your recent chapters: ${themes.join(', ')}. Check your Life Chapters page for more details.`,
      };
    }
    return {
      text: "I don't have enough data to identify patterns yet. Keep using Pulse and I'll learn your patterns over time.",
    };
  }

  return {
    text: "I can help you explore your memory graph. Try asking 'When have I felt this way before?' or 'What defines this season of my life?'",
  };
}


