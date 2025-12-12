// Creative Artifact Generator
// lib/creative/v2/artifacts.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { CreativeArtifactBlueprint } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

const CREATIVE_ARTIFACT_PROMPT = `
You are the Creative Implementer.

You see:
- A single creative idea with description and context.

Your job:
- Generate 1–3 concrete artifacts that would help the user execute this idea:
  - email/script templates,
  - call talk-tracks,
  - dashboard specs,
  - habit protocols,
  - deal playbooks, etc.

Return JSON: { "artifacts": [ { kind, title, content } ] }.

Only return valid JSON.`;

export async function generateArtifactsForIdea(userId: string, ideaId: string) {
  const dbUserId = await resolveUserId(userId);

  const { data: ideaRows, error: ideaError } = await supabaseAdmin
    .from('creative_ideas')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('id', ideaId)
    .limit(1);

  if (ideaError) {
    console.error('[Creative Cortex] Failed to fetch idea', ideaError);
    throw ideaError;
  }

  const idea = ideaRows?.[0];
  if (!idea) {
    console.warn('[Creative Cortex] Idea not found', ideaId);
    return;
  }

  const result = await callAIJson<{ artifacts: CreativeArtifactBlueprint[] }>({
    userId,
    feature: 'creative_artifacts',
    systemPrompt: CREATIVE_ARTIFACT_PROMPT,
    userPrompt: JSON.stringify({
      idea: {
        title: idea.title,
        description: idea.description,
        category: idea.category,
        tags: idea.tags || [],
        rawPayload: idea.raw_payload || {},
      },
    }, null, 2),
    maxTokens: 3000,
    temperature: 0.7,
  });

  if (!result.success || !result.data || !result.data.artifacts?.length) {
    console.error('[Creative Cortex] Failed to generate artifacts', result.error);
    return;
  }

  const { artifacts } = result.data;

  const rows = artifacts.map((a) => ({
    user_id: dbUserId,
    idea_id: ideaId,
    session_id: idea.session_id,
    kind: a.kind,
    title: a.title,
    content: a.content ?? {},
  }));

  const { data: inserted, error } = await supabaseAdmin
    .from('creative_artifacts')
    .insert(rows)
    .select('id');

  if (error) {
    console.error('[Creative Cortex] Failed to insert artifacts', error);
    throw error;
  }
  return inserted?.map((r: any) => r.id as string);
}


