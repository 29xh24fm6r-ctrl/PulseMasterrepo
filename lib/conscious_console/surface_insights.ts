// Conscious Console - Surfacing Insights
// lib/conscious_console/surface_insights.ts

import { supabaseAdmin } from '@/lib/supabase';
import { callAIJson } from '@/lib/ai/call';
import { buildConsciousConsolePayload } from './status';
import { CONSOLE_SURFACE_PROMPT } from './prompts';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function generateBrainSurfaceEventsFromLatestData(userId: string) {
  const dbUserId = await resolveUserId(userId);
  const consolePayload = await buildConsciousConsolePayload(userId);

  // Pull recent cognitive_insights not yet surfaced
  const { data: insights } = await supabaseAdmin
    .from('cognitive_insights')
    .select('*')
    .eq('user_id', dbUserId)
    .order('created_at', { ascending: false })
    .limit(100);

  // Check which insights have already been surfaced
  const { data: existingEvents } = await supabaseAdmin
    .from('pulse_brain_surface_events')
    .select('origin_id')
    .eq('user_id', dbUserId)
    .not('origin_id', 'is', null);

  const surfacedOriginIds = new Set((existingEvents ?? []).map((e: any) => e.origin_id));

  // Filter out already-surfaced insights
  const unsurfacedInsights = (insights ?? []).filter(
    (i: any) => !surfacedOriginIds.has(i.id)
  );

  if (unsurfacedInsights.length === 0) return;

  const result = await callAIJson<{
    selection: {
      events: Array<{
        source: string;
        originId?: string;
        category: string;
        title: string;
        body: string;
        importance: number;
        emotionalTone?: string;
        deliveryChannel: 'console' | 'notification' | 'none';
      }>;
    };
  }>({
    userId,
    feature: 'conscious_console_surface',
    systemPrompt: CONSOLE_SURFACE_PROMPT,
    userPrompt: JSON.stringify({
      consolePayload,
      insights: unsurfacedInsights,
    }, null, 2),
    maxTokens: 2000,
    temperature: 0.7,
  });

  if (!result.success || !result.data) {
    console.error('[Conscious Console] Failed to generate surface events', result.error);
    return;
  }

  const rows = (result.data.selection.events ?? [])
    .filter((e) => e.deliveryChannel !== 'none')
    .map((e) => ({
      user_id: dbUserId,
      source: e.source ?? 'agi_kernel',
      origin_id: e.originId ?? null,
      category: e.category,
      title: e.title,
      body: e.body,
      importance: e.importance ?? 0.6,
      emotional_tone: e.emotionalTone ?? null,
      delivery_channel: e.deliveryChannel,
      delivery_context: {},
    }));

  if (!rows.length) return;

  const { error } = await supabaseAdmin
    .from('pulse_brain_surface_events')
    .insert(rows);

  if (error) throw error;
}


