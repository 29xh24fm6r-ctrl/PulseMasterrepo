// Somatic Device Settings
// lib/somatic/v2/settings.ts

import { supabaseAdmin } from '@/lib/supabase';
import { SomaticDeviceSettings } from './types';

async function resolveUserId(clerkId: string): Promise<string> {
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("clerk_id", clerkId)
    .maybeSingle();

  return userRow?.id || clerkId;
}

export async function getSomaticDeviceSettings(userId: string): Promise<SomaticDeviceSettings> {
  const dbUserId = await resolveUserId(userId);

  const { data, error } = await supabaseAdmin
    .from('somatic_device_settings')
    .select('*')
    .eq('user_id', dbUserId)
    .limit(1);

  if (error) {
    console.error('[Somatic v2] Failed to fetch settings', error);
    throw error;
  }

  const row = data?.[0];
  if (!row) {
    return {
      phoneIntegrationEnabled: false,
      appUsageEnabled: false,
      notificationsEnabled: false,
      locationEnabled: false,
      wearableIntegrationEnabled: false,
      sleepDataEnabled: false,
      heartDataEnabled: false,
      stepsDataEnabled: false,
    };
  }

  return {
    phoneIntegrationEnabled: row.phone_integration_enabled ?? false,
    appUsageEnabled: row.app_usage_enabled ?? false,
    notificationsEnabled: row.notifications_enabled ?? false,
    locationEnabled: row.location_enabled ?? false,
    wearableIntegrationEnabled: row.wearable_integration_enabled ?? false,
    sleepDataEnabled: row.sleep_data_enabled ?? false,
    heartDataEnabled: row.heart_data_enabled ?? false,
    stepsDataEnabled: row.steps_data_enabled ?? false,
  };
}

export async function updateSomaticDeviceSettings(
  userId: string,
  settings: Partial<SomaticDeviceSettings>
): Promise<void> {
  const dbUserId = await resolveUserId(userId);

  const { error } = await supabaseAdmin
    .from('somatic_device_settings')
    .upsert(
      {
        user_id: dbUserId,
        phone_integration_enabled: settings.phoneIntegrationEnabled ?? false,
        app_usage_enabled: settings.appUsageEnabled ?? false,
        notifications_enabled: settings.notificationsEnabled ?? false,
        location_enabled: settings.locationEnabled ?? false,
        wearable_integration_enabled: settings.wearableIntegrationEnabled ?? false,
        sleep_data_enabled: settings.sleepDataEnabled ?? false,
        heart_data_enabled: settings.heartDataEnabled ?? false,
        steps_data_enabled: settings.stepsDataEnabled ?? false,
        last_updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('[Somatic v2] Failed to update settings', error);
    throw error;
  }
}


