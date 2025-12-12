// Master Brain Evolution Engine v1 - Experiment Engine
// lib/masterbrain/evolution/experiments.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { callAIJson } from '@/lib/ai/call';
import { Experiment, ExperimentRun, ExperimentOutcome } from './types';

export async function createExperimentForIdeas(params: {
  name: string;
  ideaIds: string[];
  hypothesis?: string;
  createdBy: string;
}): Promise<Experiment> {
  const { name, ideaIds, hypothesis, createdBy } = params;

  // Get ideas
  const { data: ideas } = await supabaseAdminClient
    .from('system_improvement_ideas')
    .select('*, system_modules(*)')
    .in('id', ideaIds);

  if (!ideas || ideas.length === 0) {
    throw new Error('No ideas found');
  }

  // Generate hypothesis if not provided
  let finalHypothesis = hypothesis;
  if (!finalHypothesis) {
    const result = await callAIJson<{ hypothesis: string; target_metrics: string[] }>({
      userId: createdBy.startsWith('user:') ? createdBy.replace('user:', '') : 'system',
      feature: 'experiment_hypothesis',
      systemPrompt: 'Generate a testable hypothesis and target metrics for an experiment based on improvement ideas.',
      userPrompt: `Ideas:\n${JSON.stringify(ideas.map((i: any) => ({ title: i.title, description: i.description, impact_area: i.impact_area })), null, 2)}`,
      maxTokens: 500,
      temperature: 0.7,
    });

    if (result.success && result.data) {
      finalHypothesis = result.data.hypothesis;
    } else {
      finalHypothesis = `Testing improvements: ${ideas.map((i: any) => i.title).join(', ')}`;
    }
  }

  // Determine target metrics from ideas
  const targetMetrics: string[] = [];
  for (const idea of ideas) {
    if (idea.impact_area === 'retention') {
      targetMetrics.push('user_engagement', 'daily_active_users');
    } else if (idea.impact_area === 'performance') {
      targetMetrics.push('avg_latency_ms', 'error_rate');
    } else if (idea.impact_area === 'ux') {
      targetMetrics.push('user_satisfaction', 'time_to_first_action');
    } else if (idea.impact_area === 'accuracy') {
      targetMetrics.push('data_freshness', 'prediction_accuracy');
    }
  }

  // Create experiment
  const { data: experiment, error } = await supabaseAdminClient
    .from('system_experiments')
    .insert({
      name,
      hypothesis: finalHypothesis,
      description: `Testing: ${ideas.map((i: any) => i.title).join(', ')}`,
      idea_ids: ideaIds,
      target_metrics: [...new Set(targetMetrics)],
      status: 'planned',
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (error) throw error;

  // Update ideas status
  await supabaseAdminClient
    .from('system_improvement_ideas')
    .update({ status: 'in_experiment', updated_at: new Date().toISOString() })
    .in('id', ideaIds);

  return experiment;
}

export async function summarizeExperimentOutcome(experimentId: string): Promise<ExperimentRun | null> {
  const { data: experiment } = await supabaseAdminClient
    .from('system_experiments')
    .select('*')
    .eq('id', experimentId)
    .maybeSingle();

  if (!experiment) return null;

  // Get experiment runs
  const { data: runs } = await supabaseAdminClient
    .from('system_experiment_runs')
    .select('*')
    .eq('experiment_id', experimentId)
    .order('created_at', { ascending: false });

  if (!runs || runs.length === 0) return null;

  const latestRun = runs[0];

  // If already has outcome, return it
  if (latestRun.outcome) {
    return latestRun;
  }

  // Analyze metrics
  const metricsBefore = latestRun.metrics_before ?? {};
  const metricsAfter = latestRun.metrics_after ?? {};

  // Use LLM to generate summary
  const result = await callAIJson<{
    result_summary: string;
    outcome: ExperimentOutcome;
  }>({
    userId: 'system',
    feature: 'experiment_outcome',
    systemPrompt: 'Analyze experiment metrics and determine outcome.',
    userPrompt: `Experiment: ${experiment.name}\nHypothesis: ${experiment.hypothesis}\n\nMetrics Before:\n${JSON.stringify(metricsBefore, null, 2)}\n\nMetrics After:\n${JSON.stringify(metricsAfter, null, 2)}`,
    maxTokens: 500,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    return latestRun;
  }

  const { result_summary, outcome } = result.data;

  // Update run
  const { data: updatedRun } = await supabaseAdminClient
    .from('system_experiment_runs')
    .update({
      result_summary,
      outcome,
    })
    .eq('id', latestRun.id)
    .select('*')
    .single();

  return updatedRun ?? latestRun;
}


