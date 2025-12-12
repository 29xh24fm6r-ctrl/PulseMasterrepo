// Master Brain Registry - Static Definitions
// lib/brain/registry/registry.ts

import { supabaseAdmin } from '@/lib/supabase';

export async function getAllSubsystemDefinitions() {
  const { data, error } = await supabaseAdmin
    .from('brain_subsystems')
    .select('*')
    .order('group_name', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function getSubsystemDefinition(subsystemId: string) {
  const { data, error } = await supabaseAdmin
    .from('brain_subsystems')
    .select('*')
    .eq('id', subsystemId)
    .limit(1);

  if (error) throw error;
  return data?.[0] ?? null;
}


