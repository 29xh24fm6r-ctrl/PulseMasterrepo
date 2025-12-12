// Voice Settings Service Layer
// lib/voice/settings.ts

import { supabaseAdmin } from "@/lib/supabase";
import { VoiceProfile, UserVoiceSettings } from "./types";

const DEFAULT_VOICE_KEY = 'pulse_default';

export async function getAllActiveVoices(): Promise<VoiceProfile[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('voice_profiles')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error("[VoiceSettings] Error fetching voices:", error);
      return [];
    }

    return (data ?? []) as VoiceProfile[];
  } catch (err) {
    console.error("[VoiceSettings] Exception fetching voices:", err);
    return [];
  }
}

export async function getUserVoiceSettings(userId: string): Promise<UserVoiceSettings | null> {
  try {
    // Get user's database ID
    const { data: userRow } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("clerk_id", userId)
      .single();

    const dbUserId = userRow?.id || userId;

    const { data, error } = await supabaseAdmin
      .from('user_voice_settings')
      .select('*')
      .eq('user_id', dbUserId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error("[VoiceSettings] Error fetching user settings:", error);
      return null;
    }

    return data as UserVoiceSettings | null;
  } catch (err) {
    console.error("[VoiceSettings] Exception fetching user settings:", err);
    return null;
  }
}

export async function getActiveVoiceForUser(userId: string): Promise<VoiceProfile | null> {
  try {
    const [allVoices, userSettings] = await Promise.all([
      getAllActiveVoices(),
      getUserVoiceSettings(userId),
    ]);

    if (!allVoices.length) {
      console.warn("[VoiceSettings] No active voices found");
      return null;
    }

    const key = userSettings?.active_voice_key ?? DEFAULT_VOICE_KEY;
    const found = allVoices.find((v) => v.key === key);

    return found ?? allVoices[0];
  } catch (err) {
    console.error("[VoiceSettings] Exception getting active voice:", err);
    return null;
  }
}

export async function upsertUserVoiceSettings(
  userId: string,
  partial: Partial<Pick<UserVoiceSettings, 'active_voice_key' | 'speaking_rate' | 'pitch_adjust'>>
): Promise<UserVoiceSettings> {
  // Get user's database ID
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", userId)
    .single();

  const dbUserId = userRow?.id || userId;

  const payload = {
    user_id: dbUserId,
    ...partial,
    last_updated: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('user_voice_settings')
    .upsert(payload, { onConflict: 'user_id' })
    .select('*')
    .single();

  if (error) {
    console.error("[VoiceSettings] Error upserting settings:", error);
    throw error;
  }

  return data as UserVoiceSettings;
}

