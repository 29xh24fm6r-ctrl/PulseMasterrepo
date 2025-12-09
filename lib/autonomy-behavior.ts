/**
 * Autonomy Behavior Helpers (Server-Side)
 * ========================================
 * 
 * These helpers are used in API routes to respect user's autonomy settings.
 * Since settings are stored client-side (localStorage), the client must pass
 * them to API routes that need to respect autonomy.
 */

export type AutonomyLevel = "jarvis" | "copilot" | "advisor" | "zen";

export type DomainKey = 
  | "tasks" 
  | "email" 
  | "deals" 
  | "relationships" 
  | "calendar" 
  | "habits" 
  | "journal" 
  | "notifications";

export type AutonomySettings = {
  globalLevel: AutonomyLevel;
  useDomainOverrides: boolean;
  domains: Record<DomainKey, AutonomyLevel>;
  quietHours: { enabled: boolean; start: string; end: string };
  proactiveInsights: boolean;
  voiceGreetings: boolean;
  criticalOnly: boolean;
};

export const DEFAULT_SETTINGS: AutonomySettings = {
  globalLevel: "jarvis",
  useDomainOverrides: false,
  domains: {
    tasks: "jarvis",
    email: "jarvis",
    deals: "copilot",
    relationships: "jarvis",
    calendar: "copilot",
    habits: "jarvis",
    journal: "advisor",
    notifications: "jarvis",
  },
  quietHours: { enabled: false, start: "22:00", end: "07:00" },
  proactiveInsights: true,
  voiceGreetings: true,
  criticalOnly: false,
};

const INSIGHT_TYPE_TO_DOMAIN: Record<string, DomainKey> = {
  overdue_tasks: "tasks",
  streak_risk: "habits",
  cold_relationship: "relationships",
  stale_deal: "deals",
  celebration: "notifications",
  momentum: "notifications",
};

export function isInQuietHours(settings: AutonomySettings | null): boolean {
  if (!settings?.quietHours?.enabled) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [startH, startM] = settings.quietHours.start.split(":").map(Number);
  const [endH, endM] = settings.quietHours.end.split(":").map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export function getLevelForDomain(
  domain: DomainKey, 
  settings: AutonomySettings | null
): AutonomyLevel {
  if (!settings) return DEFAULT_SETTINGS.globalLevel;
  if (settings.useDomainOverrides && settings.domains[domain]) {
    return settings.domains[domain];
  }
  return settings.globalLevel;
}

export function shouldShowInsight(
  insightType: string,
  priority: "high" | "medium" | "low",
  settings: AutonomySettings | null
): { show: boolean; reason: string } {
  if (!settings) return { show: true, reason: "No settings provided" };
  if (settings.globalLevel === "zen") return { show: false, reason: "Zen mode active" };
  
  if (isInQuietHours(settings)) {
    if (priority === "high") return { show: true, reason: "Critical during quiet hours" };
    return { show: false, reason: "Quiet hours active" };
  }
  
  if (settings.criticalOnly && priority !== "high") {
    return { show: false, reason: "Critical-only mode active" };
  }
  
  if (!settings.proactiveInsights) {
    return { show: false, reason: "Proactive insights disabled" };
  }
  
  const domain = INSIGHT_TYPE_TO_DOMAIN[insightType] || "notifications";
  const level = getLevelForDomain(domain, settings);
  
  if (level === "zen") {
    return { show: false, reason: `${domain} domain in Zen mode` };
  }
  
  return { show: true, reason: "Allowed by settings" };
}

export function filterInsightsByAutonomy<T extends { type: string; priority: string }>(
  insights: T[],
  settings: AutonomySettings | null
): { insights: T[]; filtered: number; reason?: string } {
  if (!settings) return { insights, filtered: 0 };
  
  if (settings.globalLevel === "zen") {
    return { insights: [], filtered: insights.length, reason: "Zen mode active" };
  }
  
  const original = insights.length;
  const filtered = insights.filter((insight) => {
    const result = shouldShowInsight(
      insight.type, 
      insight.priority as "high" | "medium" | "low",
      settings
    );
    return result.show;
  });
  
  return {
    insights: filtered,
    filtered: original - filtered.length,
    reason: filtered.length < original ? "Filtered by autonomy settings" : undefined,
  };
}

export function getAutonomyStatus(settings: AutonomySettings | null): {
  level: AutonomyLevel;
  inQuietHours: boolean;
  proactiveEnabled: boolean;
  summary: string;
} {
  if (!settings) {
    return {
      level: "jarvis",
      inQuietHours: false,
      proactiveEnabled: true,
      summary: "Full autonomy (Jarvis mode)",
    };
  }
  
  const inQuietHours = isInQuietHours(settings);
  
  let summary = "";
  switch (settings.globalLevel) {
    case "jarvis":
      summary = "Full autonomy";
      break;
    case "copilot":
      summary = "Assisted mode";
      break;
    case "advisor":
      summary = "Advisory only";
      break;
    case "zen":
      summary = "Do not disturb";
      break;
  }
  
  if (inQuietHours) {
    summary += " (quiet hours)";
  } else if (settings.criticalOnly) {
    summary += " (critical only)";
  }
  
  return {
    level: settings.globalLevel,
    inQuietHours,
    proactiveEnabled: settings.proactiveInsights && !inQuietHours,
    summary,
  };
}

/**
 * Check if Pulse should show the morning brief
 */
export function shouldShowMorningBrief(settings: AutonomySettings | null): boolean {
  if (!settings) return true;
  if (settings.globalLevel === "zen") return false;
  if (isInQuietHours(settings)) return false;
  return settings.proactiveInsights;
}

/**
 * Check if Pulse should speak/greet proactively
 */
export function shouldSpeak(
  settings: AutonomySettings | null,
  context: "greeting" | "notification" | "insight" = "greeting"
): boolean {
  if (!settings) return true;
  if (settings.globalLevel === "zen") return false;
  if (isInQuietHours(settings)) return false;
  
  if (context === "greeting") {
    return settings.voiceGreetings;
  }
  
  return settings.proactiveInsights;
}
