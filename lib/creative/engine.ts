// Creative Cortex v2 - Creative Engine
// lib/creative/engine.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { callAI } from '@/lib/ai/call';
import { CreativeSession, CreativeAsset, CreativeSessionMode } from './types';
import { getEgoNetwork } from '../thirdbrain/graph/query';
import { getDefaultStyleProfile } from './style';

export async function runCreativeSession(params: {
  userId: string;
  projectId?: string;
  mode: CreativeSessionMode;
  prompt: string;
  styleProfileId?: string;
}): Promise<{
  session: CreativeSession;
  primaryAsset: CreativeAsset | null;
  allAssets: CreativeAsset[];
}> {
  const { userId, projectId, mode, prompt, styleProfileId } = params;

  // 1. Get project context if projectId provided
  let projectContext = '';
  let relatedNodeId: string | null = null;
  if (projectId) {
    const { data: project } = await supabaseAdmin
      .from('creative_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (project) {
      projectContext = `Project: ${project.title}\n${project.description ?? ''}`;
      relatedNodeId = project.related_node_id;
    }
  }

  // 2. Get Third Brain graph context
  let graphContext = '';
  if (relatedNodeId) {
    try {
      const egoNetwork = await getEgoNetwork({ userId, nodeId: relatedNodeId, depth: 1, limit: 10 });
      if (egoNetwork.nodes.length > 0) {
        graphContext = `Related nodes:\n${egoNetwork.nodes.map((n) => `- ${n.title} (${n.kind})`).join('\n')}`;
      }
    } catch (e) {
      console.error('Failed to fetch graph context:', e);
    }
  }

  // 3. Get Self Mirror context
  const { data: latestSnapshot } = await supabaseAdmin
    .from('self_identity_snapshots')
    .select('roles, values, strengths')
    .eq('user_id', userId)
    .order('taken_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let selfContext = '';
  if (latestSnapshot) {
    selfContext = `User context:\n- Roles: ${JSON.stringify(latestSnapshot.roles)}\n- Values: ${JSON.stringify(latestSnapshot.values)}\n- Strengths: ${JSON.stringify(latestSnapshot.strengths)}`;
  }

  // 4. Get style profile
  let styleProfile = styleProfileId
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

  // 5. Build context summary
  const contextSummary = [projectContext, graphContext, selfContext, styleInstructions]
    .filter((s) => s.length > 0)
    .join('\n\n');

  // 6. Generate creative output
  const modeInstructions: Record<CreativeSessionMode, string> = {
    brainstorm: 'Generate a list of creative ideas, concepts, or possibilities. Be bold and exploratory.',
    drafting: 'Generate a first draft or initial version. Focus on getting ideas down, not perfection.',
    refinement: 'Refine and polish existing content. Improve clarity, structure, and impact.',
    problem_solving: 'Generate solutions, approaches, or strategies to solve a problem.',
    ideation: 'Generate novel concepts, connections, or directions. Think creatively and expansively.',
  };

  const creativePrompt = `${modeInstructions[mode]}\n\nUser Request: ${prompt}\n\n${contextSummary ? `Context:\n${contextSummary}\n\n` : ''}Generate the creative output.`;

  const result = await callAI({
    userId,
    feature: 'creative_cortex',
    systemPrompt: `You are a creative assistant that helps generate high-quality creative work. Follow the user's style preferences and constraints.`,
    userPrompt: creativePrompt,
    maxTokens: 2000,
    temperature: 0.8,
  });

  if (!result.success || !result.content) {
    throw new Error('Failed to generate creative output');
  }

  // 7. Determine asset kind based on mode
  const assetKindMap: Record<CreativeSessionMode, CreativeAsset['kind']> = {
    brainstorm: 'idea_list',
    drafting: 'text',
    refinement: 'text',
    problem_solving: 'plan',
    ideation: 'idea_list',
  };

  const assetKind = assetKindMap[mode];

  // 8. Create session
  const { data: session, error: sessionError } = await supabaseAdmin
    .from('creative_sessions')
    .insert({
      user_id: userId,
      project_id: projectId ?? null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      mode,
      prompt,
      context_summary: contextSummary,
      output_summary: result.content.substring(0, 200) + '...',
    })
    .select('*')
    .single();

  if (sessionError) throw sessionError;

  // 9. Create primary asset
  const { data: primaryAsset, error: assetError } = await supabaseAdmin
    .from('creative_assets')
    .insert({
      user_id: userId,
      project_id: projectId ?? null,
      session_id: session.id,
      kind: assetKind,
      title: `Output from ${mode} session`,
      content: result.content,
      metadata: { mode, style_profile_id: styleProfile?.id },
      related_node_id: relatedNodeId,
    })
    .select('*')
    .single();

  if (assetError) throw assetError;

  // 10. Update session with created assets
  await supabaseAdmin
    .from('creative_sessions')
    .update({
      created_assets: [{ id: primaryAsset.id, type: assetKind, title: primaryAsset.title }],
    })
    .eq('id', session.id);

  return {
    session,
    primaryAsset,
    allAssets: [primaryAsset],
  };
}


