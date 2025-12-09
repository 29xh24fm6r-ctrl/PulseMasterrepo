// Plugin API Library
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export interface Plugin {
  id: string;
  slug: string;
  name: string;
  description?: string;
  version: string;
  plugin_type: "integration" | "widget" | "coach" | "analyzer" | "automation";
  capabilities: string[];
  config_schema: Record<string, any>;
  status: string;
  is_official: boolean;
  downloads: number;
}

export interface UserPlugin {
  id: string;
  user_id: string;
  plugin_id: string;
  config: Record<string, any>;
  status: "active" | "paused" | "error" | "uninstalled";
  last_sync_at?: string;
  last_error?: string;
}

export interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at?: string;
  expires_at?: string;
}

export async function getAvailablePlugins(): Promise<Plugin[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("plugins").select("*").eq("status", "active").eq("is_public", true).order("downloads", { ascending: false });
  return data || [];
}

export async function getPluginBySlug(slug: string): Promise<Plugin | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from("plugins").select("*").eq("slug", slug).single();
  return data;
}

export async function installPlugin(userId: string, pluginSlug: string, config?: Record<string, any>): Promise<UserPlugin> {
  const supabase = getSupabase();
  const plugin = await getPluginBySlug(pluginSlug);
  if (!plugin) throw new Error("Plugin not found: " + pluginSlug);

  const { data: existing } = await supabase.from("user_plugins").select("*").eq("user_id", userId).eq("plugin_id", plugin.id).single();
  if (existing) {
    if (existing.status === "uninstalled") {
      const { data, error } = await supabase.from("user_plugins").update({ status: "active", config: config || existing.config, error_count: 0, last_error: null, updated_at: new Date().toISOString() }).eq("id", existing.id).select().single();
      if (error) throw error;
      return data;
    }
    return existing;
  }

  const { data, error } = await supabase.from("user_plugins").insert({ user_id: userId, plugin_id: plugin.id, config: config || {} }).select().single();
  if (error) throw error;
  await supabase.from("plugins").update({ downloads: plugin.downloads + 1 }).eq("id", plugin.id);
  return data;
}

export async function uninstallPlugin(userId: string, pluginSlug: string): Promise<void> {
  const supabase = getSupabase();
  const plugin = await getPluginBySlug(pluginSlug);
  if (!plugin) return;
  await supabase.from("user_plugins").update({ status: "uninstalled", updated_at: new Date().toISOString() }).eq("user_id", userId).eq("plugin_id", plugin.id);
}

export async function getUserPlugins(userId: string): Promise<(UserPlugin & { plugin: Plugin })[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("user_plugins").select("*, plugin:plugins(*)").eq("user_id", userId).neq("status", "uninstalled");
  return data || [];
}

export async function updatePluginConfig(userId: string, pluginSlug: string, config: Record<string, any>): Promise<UserPlugin> {
  const supabase = getSupabase();
  const plugin = await getPluginBySlug(pluginSlug);
  if (!plugin) throw new Error("Plugin not found: " + pluginSlug);
  const { data, error } = await supabase.from("user_plugins").update({ config, updated_at: new Date().toISOString() }).eq("user_id", userId).eq("plugin_id", plugin.id).select().single();
  if (error) throw error;
  return data;
}

export async function createAPIKey(userId: string, name: string, scopes: string[] = ["read"], expiresInDays?: number): Promise<{ key: string; apiKey: APIKey }> {
  const supabase = getSupabase();
  const rawKey = "pulse_" + crypto.randomBytes(32).toString("hex");
  const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
  const keyPrefix = rawKey.substring(0, 12);
  const expiresAt = expiresInDays ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000) : undefined;

  const { data, error } = await supabase.from("plugin_api_keys").insert({ user_id: userId, name, key_hash: keyHash, key_prefix: keyPrefix, scopes, expires_at: expiresAt?.toISOString() }).select().single();
  if (error) throw error;
  return { key: rawKey, apiKey: data };
}

export async function validateAPIKey(key: string): Promise<{ userId: string; scopes: string[] } | null> {
  const supabase = getSupabase();
  const keyHash = crypto.createHash("sha256").update(key).digest("hex");
  const keyPrefix = key.substring(0, 12);
  const { data } = await supabase.from("plugin_api_keys").select("user_id, scopes, expires_at, is_active").eq("key_hash", keyHash).eq("key_prefix", keyPrefix).single();
  if (!data || !data.is_active) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;
  return { userId: data.user_id, scopes: data.scopes };
}

export async function revokeAPIKey(userId: string, keyId: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from("plugin_api_keys").update({ is_active: false }).eq("id", keyId).eq("user_id", userId);
}

export async function getUserAPIKeys(userId: string): Promise<APIKey[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("plugin_api_keys").select("id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false });
  return data || [];
}

export async function createAutomation(userId: string, automation: { name: string; description?: string; triggerPluginSlug?: string; triggerEvent: string; triggerConditions?: Record<string, any>; actionPluginSlug?: string; actionType: string; actionConfig: Record<string, any> }): Promise<any> {
  const supabase = getSupabase();
  let triggerPluginId = null, actionPluginId = null;
  if (automation.triggerPluginSlug) { const p = await getPluginBySlug(automation.triggerPluginSlug); triggerPluginId = p?.id; }
  if (automation.actionPluginSlug) { const p = await getPluginBySlug(automation.actionPluginSlug); actionPluginId = p?.id; }

  const { data, error } = await supabase.from("plugin_automations").insert({
    user_id: userId,
    name: automation.name,
    description: automation.description,
    trigger_plugin_id: triggerPluginId,
    trigger_event: automation.triggerEvent,
    trigger_conditions: automation.triggerConditions || {},
    action_plugin_id: actionPluginId,
    action_type: automation.actionType,
    action_config: automation.actionConfig,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getUserAutomations(userId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data } = await supabase.from("plugin_automations").select("*").eq("user_id", userId).eq("is_active", true).order("created_at", { ascending: false });
  return data || [];
}

export const PluginAPI = { getAvailablePlugins, getPluginBySlug, installPlugin, uninstallPlugin, getUserPlugins, updatePluginConfig, createAPIKey, validateAPIKey, revokeAPIKey, getUserAPIKeys, createAutomation, getUserAutomations };
export default PluginAPI;