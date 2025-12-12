// Chapter / Compression Engine
// lib/thirdbrain/graph/chapters.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAI } from '@/lib/ai/call';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function generateChapterForPeriod(
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<string> {
  const dbUserId = await resolveUserId(userId);

  // Fetch key nodes within time range
  const { data: nodes } = await supabaseAdmin
    .from('tb_nodes')
    .select('*')
    .eq('user_id', dbUserId)
    .gte('started_at', periodStart)
    .lte('started_at', periodEnd)
    .order('started_at', { ascending: false })
    .limit(50);

  if (!nodes || nodes.length === 0) {
    throw new Error('No nodes found for period');
  }

  // Select most important nodes (heuristic: deals, experiments, high-stress emotion states)
  const importantNodes = nodes.filter((n: any) => {
    const type = n.type;
    return (
      type === 'deal' ||
      type === 'experiment' ||
      (type === 'emotion_state' && (n.props?.stress || 0) > 0.7) ||
      type === 'call'
    );
  });

  // Build context for LLM
  const nodeSummaries = importantNodes
    .slice(0, 20)
    .map((n: any) => `${n.type}: ${JSON.stringify(n.props).slice(0, 100)}`)
    .join('\n');

  const systemPrompt = `You are a biographer summarizing a period of someone's life. Create a compelling chapter title, summary, and tags based on the events and patterns.`;

  const userPrompt = `Period: ${periodStart} to ${periodEnd}

Key events and nodes:
${nodeSummaries}

Generate:
1. A compelling chapter title (2-8 words)
2. A 3-5 paragraph narrative summary in markdown
3. 3-7 tags (single words or short phrases)

Respond with JSON: { "title": "...", "summary_md": "...", "tags": [...] }`;

  const result = await callAI({
    userId,
    model: 'gpt-4o-mini',
    systemPrompt,
    userPrompt,
    temperature: 0.7,
    maxTokens: 1000,
    feature: 'chapter_generation',
    jsonMode: true,
  });

  let parsed: any = {};
  if (result.success && result.content) {
    try {
      // Try to extract JSON from response
      let jsonStr = result.content;
      const jsonMatch = jsonStr.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      } else {
        const rawMatch = jsonStr.match(/[\[{][\s\S]*[\]}]/);
        if (rawMatch) {
          jsonStr = rawMatch[0];
        }
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      // Fallback
      parsed = {
        title: `Period: ${periodStart} to ${periodEnd}`,
        summary_md: 'This period included various activities and events.',
        tags: [],
      };
    }
  } else {
    // Fallback
    parsed = {
      title: `Period: ${periodStart} to ${periodEnd}`,
      summary_md: 'This period included various activities and events.',
      tags: [],
    };
  }

  // Get key node IDs
  const keyNodeIds = importantNodes.slice(0, 10).map((n: any) => n.id);

  // Create chapter
  const { data: chapter, error } = await supabaseAdmin
    .from('tb_chapters')
    .insert({
      user_id: dbUserId,
      title: parsed.title || `Period: ${periodStart} to ${periodEnd}`,
      summary_md: parsed.summary_md || 'Summary not available.',
      period_start: periodStart,
      period_end: periodEnd,
      tags: parsed.tags || [],
      key_node_ids: keyNodeIds,
    })
    .select('id')
    .single();

  if (error || !chapter) {
    throw new Error(`Failed to create chapter: ${error?.message || 'Unknown error'}`);
  }

  return chapter.id;
}


