// Master Brain Evolution Engine v1 - Changelog Engine
// lib/masterbrain/evolution/changelog.ts

import { supabaseAdminClient } from '../../supabase/admin';
import { ChangelogEntry } from './types';
import { getModuleByKey } from '../registry';

export async function logChangelogEntry(params: {
  title: string;
  description?: string;
  moduleKey?: string;
  tags?: string[];
  experimentId?: string;
  createdBy: string;
}): Promise<ChangelogEntry> {
  const { title, description, moduleKey, tags, experimentId, createdBy } = params;

  let moduleId: string | null = null;
  if (moduleKey) {
    const module = await getModuleByKey(moduleKey);
    moduleId = module?.id ?? null;
  }

  const { data: entry, error } = await supabaseAdminClient
    .from('system_changelog')
    .insert({
      title,
      description: description ?? null,
      module_id: moduleId,
      tags: tags ?? [],
      experiment_id: experimentId ?? null,
      created_by: createdBy,
    })
    .select('*')
    .single();

  if (error) throw error;
  return entry;
}


