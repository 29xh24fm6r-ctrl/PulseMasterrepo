// Creative Cortex v2 - Remix Module
// lib/creative/remix.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAI } from '@/lib/ai/call';
import { CreativeAsset, CreativeAssetKind } from './types';
import { getDefaultStyleProfile } from './style';

export async function remixCreativeAsset(params: {
  userId: string;
  assetId: string;
  targetKind: CreativeAssetKind;
  styleProfileId?: string;
}): Promise<CreativeAsset> {
  const { userId, assetId, targetKind, styleProfileId } = params;

  // 1. Get original asset
  const { data: originalAsset } = await supabaseAdmin
    .from('creative_assets')
    .select('*')
    .eq('id', assetId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!originalAsset) {
    throw new Error('Asset not found');
  }

  // 2. Get style profile
  const styleProfile = styleProfileId
    ? await supabaseAdmin
        .from('creative_style_profiles')
        .select('*')
        .eq('id', styleProfileId)
        .eq('user_id', userId)
        .maybeSingle()
    : await getDefaultStyleProfile(userId);

  const styleInstructions = styleProfile
    ? `Style: ${styleProfile.tone ?? 'neutral'}\nConstraints: ${JSON.stringify(styleProfile.constraints ?? {})}`
    : '';

  // 3. Determine target format instructions
  const formatInstructions: Record<CreativeAssetKind, string> = {
    text: 'Convert to a full text/article format.',
    outline: 'Convert to a structured outline with headings and bullet points.',
    plan: 'Convert to an actionable plan with steps and milestones.',
    idea_list: 'Extract and list key ideas or concepts.',
    prompt: 'Convert to a prompt or instruction format.',
    spec: 'Convert to a technical specification format.',
    story: 'Convert to a narrative story format.',
    email: 'Convert to an email format.',
    slide_bullets: 'Convert to slide bullet points (concise, scannable).',
    tweet_thread: 'Convert to a Twitter thread format (multiple tweets, numbered).',
  };

  // 4. Generate remix
  const remixPrompt = `Original content:\n${originalAsset.content}\n\n${formatInstructions[targetKind]}\n\n${styleInstructions ? `Style guidelines:\n${styleInstructions}` : ''}`;

  const result = await callAI({
    userId,
    feature: 'creative_remix',
    systemPrompt: 'You are a creative remix assistant. Transform content into the requested format while preserving core ideas and meaning.',
    userPrompt: remixPrompt,
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.content) {
    throw new Error('Failed to remix asset');
  }

  // 5. Create new asset
  const { data: remixedAsset, error } = await supabaseAdmin
    .from('creative_assets')
    .insert({
      user_id: userId,
      project_id: originalAsset.project_id,
      session_id: originalAsset.session_id,
      kind: targetKind,
      title: `Remix: ${originalAsset.title ?? 'Untitled'} → ${targetKind}`,
      content: result.content,
      metadata: {
        remixed_from: assetId,
        original_kind: originalAsset.kind,
        style_profile_id: styleProfile?.id,
      },
      related_node_id: originalAsset.related_node_id,
    })
    .select('*')
    .single();

  if (error) throw error;
  return remixedAsset;
}


