// Mythic Dojo v1 - Belt Table Helpers
// lib/mythic_dojo/v1/belt_table.ts

import { supabaseAdminClient } from '../../supabase/admin';

export async function getBeltLadder(archetypeId: string) {
  const { data, error } = await supabaseAdminClient
    .from('mythic_belt_levels')
    .select('*')
    .eq('archetype_id', archetypeId)
    .order('belt_rank', { ascending: true });

  if (error) throw error;
  return data ?? [];
}


