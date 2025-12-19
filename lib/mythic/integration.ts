// Mythic Intelligence Layer v1 - Integration Hooks
// lib/mythic/integration.ts

import "server-only";
import { supabaseAdmin } from '@/lib/supabase/admin';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function syncMythicToIdentity(userId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get mythic profile
  const { data: profile } = await supabaseAdmin
    .from('user_mythic_profile')
    .select('*, life_chapters(*)')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (!profile) return;

  // Get archetype names
  const archetypeIds = profile.dominant_life_archetypes?.map((a: any) => a.archetype_id) ?? [];
  const { data: archetypes } = await supabaseAdmin
    .from('mythic_archetypes')
    .select('id, name, slug')
    .in('id', archetypeIds);

  const archetypeNames = archetypes?.map((a: any) => a.name) ?? [];
  const mythicRoles = archetypeNames.join('-');

  // Update identity snapshot with mythic data
  const { data: latestIdentity } = await supabaseAdmin
    .from('identity_snapshots')
    .select('*')
    .eq('user_id', dbUserId)
    .order('snapshot_time', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latestIdentity) {
    await supabaseAdmin
      .from('identity_snapshots')
      .update({
        mythic_roles: mythicRoles,
        core_motifs: profile.recurring_motifs,
        current_mythic_phase: profile.current_phase,
        updated_at: new Date().toISOString(),
      })
      .eq('id', latestIdentity.id);
  }
}

export async function syncMythicToDestiny(userId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get current chapter and profile
  const { data: profile } = await supabaseAdmin
    .from('user_mythic_profile')
    .select('*, life_chapters(*)')
    .eq('user_id', dbUserId)
    .maybeSingle();

  if (!profile || !profile.current_chapter_id) return;

  const currentChapter = profile.life_chapters?.[0];

  // Update destiny arc with mythic context
  const { data: destinyArc } = await supabaseAdmin
    .from('destiny_arcs')
    .select('*')
    .eq('user_id', dbUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (destinyArc && currentChapter) {
    await supabaseAdmin
      .from('destiny_arcs')
      .update({
        mythic_chapter_id: currentChapter.id,
        mythic_chapter_name: currentChapter.chapter_name,
        mythic_phase: profile.current_phase,
        updated_at: new Date().toISOString(),
      })
      .eq('id', destinyArc.id);
  }
}

export async function applyDealArchetypeToCoaches(dealId: string, userId: string): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  // Get latest deal archetype run
  const { data: run } = await supabaseAdmin
    .from('deal_archetype_runs')
    .select('*, mythic_archetypes(*)')
    .eq('user_id', dbUserId)
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run) return;

  // Update deal with archetype context
  await supabaseAdmin
    .from('deals')
    .update({
      mythic_archetype_id: run.archetype_id,
      mythic_archetype_slug: run.mythic_archetypes?.slug,
      recommended_strategy: run.recommended_strategy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId);

  // Coaches can read this data from the deal record
  // Sales Coach, Deal Coach, etc. will see the archetype and adjust their playbook
}


