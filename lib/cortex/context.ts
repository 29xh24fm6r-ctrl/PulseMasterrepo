// Cortex Context Helper for Coaches
// lib/cortex/context.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export interface WorkCortexContext {
  recentSignals: any[];
  strongestPatterns: any[];
  topSkills: any[];
  latestPredictions: any[];
  recentAnomalies: any[];
}

export async function getWorkCortexContextForUser(userId: string): Promise<WorkCortexContext> {
  const dbUserId = await resolveUserId(userId);
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const startDate = sevenDaysAgo.toISOString().slice(0, 10);

  // Fetch recent signals (last 7 days)
  const { data: signals } = await supabaseAdmin
    .from('cortex_signals')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .gte('window_date', startDate)
    .order('window_date', { ascending: false })
    .limit(50);

  // Fetch strongest patterns
  const { data: patterns } = await supabaseAdmin
    .from('cortex_patterns')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .gt('strength', 0.5)
    .order('strength', { ascending: false })
    .limit(10);

  // Fetch top skills
  const { data: skills } = await supabaseAdmin
    .from('cortex_skills')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch latest predictions
  const { data: predictions } = await supabaseAdmin
    .from('cortex_predictions')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .order('created_at', { ascending: false })
    .limit(10);

  // Fetch recent anomalies
  const { data: anomalies } = await supabaseAdmin
    .from('cortex_anomalies')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('area_key', 'work')
    .gte('window_date', startDate)
    .order('severity', { ascending: false })
    .limit(10);

  return {
    recentSignals: signals || [],
    strongestPatterns: patterns || [],
    topSkills: skills || [],
    latestPredictions: predictions || [],
    recentAnomalies: anomalies || [],
  };
}
