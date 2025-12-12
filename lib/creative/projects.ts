// Creative Cortex v2 - Project Manager
// lib/creative/projects.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { CreativeProject, CreativeProjectKind } from './types';

export async function createCreativeProject(params: {
  userId: string;
  title: string;
  description?: string;
  kind: CreativeProjectKind;
  relatedNodeId?: string;
  tags?: string[];
}): Promise<CreativeProject> {
  const { userId, title, description, kind, relatedNodeId, tags } = params;

  const { data, error } = await supabaseAdminClient
    .from('creative_projects')
    .insert({
      user_id: userId,
      title,
      description: description ?? null,
      kind,
      related_node_id: relatedNodeId ?? null,
      tags: tags ?? [],
    })
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function listCreativeProjects(userId: string): Promise<CreativeProject[]> {
  const { data, error } = await supabaseAdminClient
    .from('creative_projects')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getCreativeProject(userId: string, projectId: string): Promise<CreativeProject | null> {
  const { data, error } = await supabaseAdminClient
    .from('creative_projects')
    .select('*')
    .eq('id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}


