// Presence Daily Summaries
// lib/presence/summaries.ts

import { supabaseAdmin } from '@/lib/supabase';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function refreshPresenceDailySummary(userId: string, date: Date) {
  const dbUserId = await resolveUserId(userId);
  const day = date.toISOString().slice(0, 10);

  const [
    events,
    surfaced,
    acks,
  ] = await Promise.all([
    supabaseAdmin
      .from('presence_events')
      .select('id')
      .eq('user_id', dbUserId)
      .gte('created_at', `${day}T00:00:00Z`)
      .lte('created_at', `${day}T23:59:59Z`),
    supabaseAdmin
      .from('pulse_brain_surface_events')
      .select('id, delivery_channel')
      .eq('user_id', dbUserId)
      .gte('created_at', `${day}T00:00:00Z`)
      .lte('created_at', `${day}T23:59:59Z`),
    supabaseAdmin
      .from('pulse_insight_acknowledgements')
      .select('reaction')
      .eq('user_id', dbUserId)
      .gte('created_at', `${day}T00:00:00Z`)
      .lte('created_at', `${day}T23:59:59Z`),
  ]);

  const eventsGenerated = events?.data?.length ?? 0;
  const surfacedEvents = surfaced?.data ?? [];
  const acksData = acks?.data ?? [];

  const notificationsSent = surfacedEvents.filter((s: any) => s.delivery_channel === 'notification').length;
  const emailsSent = surfacedEvents.filter((s: any) => s.delivery_channel === 'email').length;

  const liked = acksData.filter((a: any) => a.reaction === 'liked').length;
  const dismissed = acksData.filter((a: any) => a.reaction === 'dismissed').length;
  const acted = acksData.filter((a: any) => a.reaction === 'acted').length;
  const snoozed = acksData.filter((a: any) => a.reaction === 'snoozed').length;

  const { error } = await supabaseAdmin
    .from('presence_daily_summaries')
    .upsert(
      {
        user_id: dbUserId,
        summary_date: day,
        events_generated: eventsGenerated,
        events_surfaced: surfacedEvents.length,
        notifications_sent: notificationsSent,
        emails_sent: emailsSent,
        user_ack_liked: liked,
        user_ack_dismissed: dismissed,
        user_ack_acted: acted,
        user_ack_snoozed: snoozed,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,summary_date' }
    );

  if (error) throw error;
}


