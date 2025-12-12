// Third Brain Graph v4 - Core Service
// lib/thirdbrain/graph/service.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export type TBNodeType =
  | 'event'
  | 'person'
  | 'deal'
  | 'project'
  | 'call'
  | 'message'
  | 'emotion_state'
  | 'task'
  | 'habit'
  | 'experiment'
  | 'idea'
  | 'finance_event'
  | 'household_event'
  | 'training_session';

export interface CreateNodeInput {
  userId: string;
  orgId?: string | null;
  householdId?: string | null;
  type: TBNodeType;
  sourceTable?: string;
  sourceId?: string;
  props: Record<string, any>;
  startedAt?: string;
  endedAt?: string;
}

export async function createNode(input: CreateNodeInput): Promise<string> {
  const dbUserId = await resolveUserId(input.userId);

  const { data, error } = await supabaseAdmin
    .from('tb_nodes')
    .insert({
      user_id: dbUserId,
      org_id: input.orgId || null,
      household_id: input.householdId || null,
      type: input.type,
      source_table: input.sourceTable || null,
      source_id: input.sourceId || null,
      props: input.props,
      started_at: input.startedAt || null,
      ended_at: input.endedAt || null,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create graph node: ${error?.message || 'Unknown error'}`);
  }

  return data.id;
}

export interface CreateEdgeInput {
  userId: string;
  fromNodeId: string;
  toNodeId: string;
  kind: string;
  weight?: number;
  props?: Record<string, any>;
}

export async function createEdge(input: CreateEdgeInput): Promise<string> {
  const dbUserId = await resolveUserId(input.userId);

  const { data, error } = await supabaseAdmin
    .from('tb_edges')
    .insert({
      user_id: dbUserId,
      from_node_id: input.fromNodeId,
      to_node_id: input.toNodeId,
      kind: input.kind,
      weight: input.weight || null,
      props: input.props || {},
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create graph edge: ${error?.message || 'Unknown error'}`);
  }

  return data.id;
}

export async function linkNodes(
  userId: string,
  fromNodeId: string,
  toNodeId: string,
  kind: string,
  weight?: number,
  props?: Record<string, any>,
): Promise<string> {
  return createEdge({
    userId,
    fromNodeId,
    toNodeId,
    kind,
    weight,
    props,
  });
}

export async function getNodeBySource(
  userId: string,
  sourceTable: string,
  sourceId: string,
): Promise<any | null> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('tb_nodes')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('source_table', sourceTable)
    .eq('source_id', sourceId)
    .maybeSingle();

  if (error) {
    console.error('[Graph] Failed to get node by source', error);
    return null;
  }

  return data;
}

export async function getNode(nodeId: string): Promise<any | null> {
  const { data, error } = await supabaseAdmin
    .from('tb_nodes')
    .select('*')
    .eq('id', nodeId)
    .maybeSingle();

  if (error) {
    console.error('[Graph] Failed to get node', error);
    return null;
  }

  return data;
}

export async function getEdgesForNode(
  userId: string,
  nodeId: string,
  direction: 'in' | 'out' | 'both' = 'both',
): Promise<any[]> {
  const dbUserId = await resolveUserId(userId);

  const queries: any[] = [];

  if (direction === 'in' || direction === 'both') {
    const { data: inEdges } = await supabaseAdmin
      .from('tb_edges')
      .select(`
        *,
        from_node:tb_nodes!tb_edges_from_node_id_fkey(*)
      `)
      .eq('user_id', dbUserId)
      .eq('to_node_id', nodeId);

    if (inEdges) {
      queries.push(...inEdges);
    }
  }

  if (direction === 'out' || direction === 'both') {
    const { data: outEdges } = await supabaseAdmin
      .from('tb_edges')
      .select(`
        *,
        to_node:tb_nodes!tb_edges_to_node_id_fkey(*)
      `)
      .eq('user_id', dbUserId)
      .eq('from_node_id', nodeId);

    if (outEdges) {
      queries.push(...outEdges);
    }
  }

  return queries;
}


