// Third Brain Graph v4 - Civilization Engine
// lib/thirdbrain/civilization/engine.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';
import { CivilizationDomain, CivilizationDomainState, KnowledgeNode } from '../graph/types';

const DEFAULT_DOMAINS = [
  { key: 'work', name: 'Work', description: 'Professional projects, deals, and career' },
  { key: 'family', name: 'Family', description: 'Family relationships and activities' },
  { key: 'health', name: 'Health', description: 'Physical and mental well-being' },
  { key: 'money', name: 'Money', description: 'Financial planning and transactions' },
  { key: 'pulse', name: 'Pulse OS', description: 'Pulse OS usage and optimization' },
  { key: 'learning', name: 'Learning', description: 'Education and skill development' },
  { key: 'relationships', name: 'Relationships', description: 'Social connections and friendships' },
  { key: 'home', name: 'Home', description: 'Home life and personal space' },
];

export async function ensureDefaultDomainsSeeded(userId: string): Promise<void> {
  for (const domain of DEFAULT_DOMAINS) {
    await supabaseAdmin
      .from('civilization_domains')
      .upsert(
        {
          user_id: userId,
          key: domain.key,
          name: domain.name,
          description: domain.description,
          is_active: true,
        },
        { onConflict: 'user_id,key' }
      );
  }
}

export async function mapNodeToDomains(userId: string, nodeId: string): Promise<void> {
  // Get the node
  const { data: node } = await supabaseAdmin
    .from('knowledge_nodes')
    .select('*')
    .eq('id', nodeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!node) return;

  // Get all active domains
  const { data: domains } = await supabaseAdmin
    .from('civilization_domains')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!domains) return;

  const mappings: Array<{ domain_id: string; weight: number }> = [];

  // Simple v1 mapping rules
  for (const domain of domains) {
    let weight = 0;

    // Kind-based mapping
    if (domain.key === 'work') {
      if (['deal', 'project', 'task'].includes(node.kind)) {
        weight = 1.0;
      }
    } else if (domain.key === 'family') {
      if (node.kind === 'person' && node.tags.some((t) => ['family', 'kids', 'spouse', 'parent'].includes(t.toLowerCase()))) {
        weight = 1.0;
      }
    } else if (domain.key === 'money') {
      if (['transaction', 'budget', 'goal'].includes(node.kind) || node.tags.some((t) => ['finance', 'money', 'budget'].includes(t.toLowerCase()))) {
        weight = 1.0;
      }
    } else if (domain.key === 'health') {
      if (node.tags.some((t) => ['health', 'fitness', 'wellness', 'medical'].includes(t.toLowerCase()))) {
        weight = 1.0;
      }
    } else if (domain.key === 'learning') {
      if (node.kind === 'concept' || node.tags.some((t) => ['learning', 'education', 'skill'].includes(t.toLowerCase()))) {
        weight = 1.0;
      }
    } else if (domain.key === 'relationships') {
      if (node.kind === 'person' && !node.tags.some((t) => ['family', 'work'].includes(t.toLowerCase()))) {
        weight = 1.0;
      }
    } else if (domain.key === 'home') {
      if (node.tags.some((t) => ['home', 'house', 'personal'].includes(t.toLowerCase()))) {
        weight = 1.0;
      }
    } else if (domain.key === 'pulse') {
      if (node.tags.some((t) => ['pulse', 'system', 'automation'].includes(t.toLowerCase()))) {
        weight = 1.0;
      }
    }

    if (weight > 0) {
      mappings.push({ domain_id: domain.id, weight });
    }
  }

  // Upsert mappings
  for (const mapping of mappings) {
    await supabaseAdmin
      .from('civilization_domain_mappings')
      .upsert(
        {
          user_id: userId,
          domain_id: mapping.domain_id,
          node_id: nodeId,
          weight: mapping.weight,
        },
        { onConflict: 'domain_id,node_id' }
      );
  }
}

export async function computeDomainStates(userId: string, snapshotDate?: Date): Promise<CivilizationDomainState[]> {
  const date = snapshotDate ?? new Date();
  const dateStr = date.toISOString().slice(0, 10);

  // Ensure domains exist
  await ensureDefaultDomainsSeeded(userId);

  // Get all active domains
  const { data: domains } = await supabaseAdmin
    .from('civilization_domains')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (!domains) return [];

  const states: CivilizationDomainState[] = [];

  // Get memory events in last 30 days
  const thirtyDaysAgo = new Date(date);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

  const { data: recentEvents } = await supabaseAdmin
    .from('memory_events')
    .select('*, knowledge_nodes(*)')
    .eq('user_id', userId)
    .gte('occurred_at', thirtyDaysAgoStr)
    .lte('occurred_at', date.toISOString());

  // Get domain mappings
  const { data: mappings } = await supabaseAdmin
    .from('civilization_domain_mappings')
    .select('*, civilization_domains(*)')
    .eq('user_id', userId);

  const nodeToDomains = new Map<string, string[]>();
  if (mappings) {
    for (const mapping of mappings) {
      const nodeId = mapping.node_id;
      const domainId = mapping.domain_id;
      const existing = nodeToDomains.get(nodeId) ?? [];
      existing.push(domainId);
      nodeToDomains.set(nodeId, existing);
    }
  }

  // Get conflict edges
  const { data: conflictEdges } = await supabaseAdmin
    .from('knowledge_edges')
    .select('from_node_id, to_node_id')
    .eq('user_id', userId)
    .eq('relation', 'conflicts_with');

  for (const domain of domains) {
    // Find nodes in this domain
    const domainNodeIds = new Set<string>();
    if (mappings) {
      for (const mapping of mappings) {
        if (mapping.domain_id === domain.id) {
          domainNodeIds.add(mapping.node_id);
        }
      }
    }

    // Compute activity_score: sum of memory event weights for domain nodes
    let activitySum = 0;
    let activityCount = 0;
    if (recentEvents) {
      for (const event of recentEvents) {
        if (event.node_id && domainNodeIds.has(event.node_id)) {
          activitySum += event.weight;
          activityCount++;
        }
      }
    }

    // Normalize activity (0-100 scale, based on typical activity)
    const activityScore = Math.min((activitySum / 10) * 10, 100); // Rough normalization

    // Compute tension_score: conflicts within domain + overdue tasks
    let tensionSum = 0;
    if (conflictEdges) {
      for (const edge of conflictEdges) {
        if (domainNodeIds.has(edge.from_node_id) && domainNodeIds.has(edge.to_node_id)) {
          tensionSum += 1;
        }
      }
    }

    // Normalize tension (0-100 scale)
    const tensionScore = Math.min((tensionSum / domainNodeIds.size) * 20, 100);

    // Compute health_score: composite of activity vs tension
    // High activity + low tension = healthy
    // Low activity + high tension = unhealthy
    // High activity + high tension = overstrained
    let healthScore = activityScore;
    if (tensionScore > 50) {
      healthScore -= tensionScore * 0.5; // Tension reduces health
    }
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Generate summary (placeholder - will be enhanced with LLM)
    let summary = `${domain.name}: `;
    if (activityScore > 70 && tensionScore < 30) {
      summary += 'thriving and balanced';
    } else if (activityScore > 70 && tensionScore > 50) {
      summary += 'overstrained, needs attention';
    } else if (activityScore < 30) {
      summary += 'quiet, may need engagement';
    } else {
      summary += 'moderate activity';
    }

    // Upsert state
    const { data: state } = await supabaseAdmin
      .from('civilization_domain_state')
      .upsert(
        {
          domain_id: domain.id,
          snapshot_date: dateStr,
          activity_score: Math.round(activityScore * 100) / 100,
          tension_score: Math.round(tensionScore * 100) / 100,
          health_score: Math.round(healthScore * 100) / 100,
          summary,
        },
        { onConflict: 'domain_id,snapshot_date' }
      )
      .select('*')
      .single();

    if (state) {
      states.push(state);
    }
  }

  return states;
}


