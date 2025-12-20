// Plugin Types (client-safe)
// lib/plugins/types.ts

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

