"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, createElement } from "react";

// ============================================
// TYPES
// ============================================

export type AutonomyLevel = "jarvis" | "copilot" | "advisor" | "zen";

export type DomainKey = "tasks" | "email" | "deals" | "relationships" | "calendar" | "habits" | "journal" | "notifications";

export type DomainSettings = Record<DomainKey, AutonomyLevel>;

export type AutonomySettings = {
  globalLevel: AutonomyLevel;
  useDomainOverrides: boolean;
  domains: DomainSettings;
  quietHours: { enabled: boolean; start: string; end: string };
  proactiveInsights: boolean;
  voiceGreetings: boolean;
  criticalOnly: boolean;
};

// ============================================
// DEFAULTS
// ============================================

export const DEFAULT_AUTONOMY_SETTINGS: AutonomySettings = {
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

const STORAGE_KEY = "pulse-autonomy-settings";

// ============================================
// CONTEXT TYPE
// ============================================

type AutonomyContextType = {
  settings: AutonomySettings;
  loaded: boolean;
  updateSettings: (newSettings: Partial<AutonomySettings>) => void;
  
  // Helper methods
  getLevelForDomain: (domain: DomainKey) => AutonomyLevel;
  canAutoExecute: (domain: DomainKey, isHighStakes?: boolean) => boolean;
  canSuggest: (domain: DomainKey) => boolean;
  canNotifyProactively: (domain: DomainKey, isCritical?: boolean) => boolean;
  shouldShowVoiceGreeting: () => boolean;
  shouldShowProactiveInsights: () => boolean;
  isInQuietHours: () => boolean;
};

// ============================================
// CONTEXT
// ============================================

const AutonomyContext = createContext<AutonomyContextType | null>(null);

// ============================================
// HELPER FUNCTIONS
// ============================================

function loadSettings(): AutonomySettings {
  if (typeof window === "undefined") return DEFAULT_AUTONOMY_SETTINGS;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_AUTONOMY_SETTINGS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Failed to load autonomy settings:", e);
  }
  return DEFAULT_AUTONOMY_SETTINGS;
}

function saveSettings(settings: AutonomySettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("autonomy-settings-changed", { detail: settings }));
  } catch (e) {
    console.error("Failed to save autonomy settings:", e);
  }
}

function checkQuietHours(settings: AutonomySettings): boolean {
  if (!settings.quietHours.enabled) return false;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = settings.quietHours.start.split(":").map(Number);
  const [endH, endM] = settings.quietHours.end.split(":").map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  // Handle overnight quiet hours (e.g., 22:00 to 07:00)
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

// ============================================
// PROVIDER
// ============================================

export function AutonomyProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AutonomySettings>(DEFAULT_AUTONOMY_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    setSettings(loadSettings());
    setLoaded(true);

    // Listen for changes from other tabs/components
    const handleChange = (e: Event) => {
      const customEvent = e as CustomEvent<AutonomySettings>;
      setSettings(customEvent.detail);
    };

    window.addEventListener("autonomy-settings-changed", handleChange);
    return () => window.removeEventListener("autonomy-settings-changed", handleChange);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<AutonomySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      saveSettings(updated);
      return updated;
    });
  }, []);

  // Get level for a specific domain
  const getLevelForDomain = useCallback(
    (domain: DomainKey): AutonomyLevel => {
      if (settings.useDomainOverrides && settings.domains[domain]) {
        return settings.domains[domain];
      }
      return settings.globalLevel;
    },
    [settings]
  );

  // Can Pulse auto-execute an action?
  const canAutoExecute = useCallback(
    (domain: DomainKey, isHighStakes = false): boolean => {
      if (checkQuietHours(settings)) return false;

      const level = getLevelForDomain(domain);
      switch (level) {
        case "jarvis":
          return true;
        case "copilot":
          return !isHighStakes;
        case "advisor":
        case "zen":
          return false;
        default:
          return false;
      }
    },
    [settings, getLevelForDomain]
  );

  // Can Pulse suggest actions?
  const canSuggest = useCallback(
    (domain: DomainKey): boolean => {
      if (checkQuietHours(settings)) return false;
      if (settings.criticalOnly) return false;

      const level = getLevelForDomain(domain);
      return level !== "zen";
    },
    [settings, getLevelForDomain]
  );

  // Can Pulse send proactive notifications?
  const canNotifyProactively = useCallback(
    (domain: DomainKey, isCritical = false): boolean => {
      // Critical always goes through (except zen)
      if (isCritical && settings.globalLevel !== "zen") return true;

      // Quiet hours block non-critical
      if (checkQuietHours(settings)) return false;

      // Critical-only mode
      if (settings.criticalOnly) return isCritical;

      // Check proactive insights setting
      if (!settings.proactiveInsights) return false;

      const level = getLevelForDomain(domain);
      return level !== "zen";
    },
    [settings, getLevelForDomain]
  );

  // Should Pulse speak first with a greeting?
  const shouldShowVoiceGreeting = useCallback((): boolean => {
    if (checkQuietHours(settings)) return false;
    if (settings.globalLevel === "zen") return false;
    return settings.voiceGreetings;
  }, [settings]);

  // Should Pulse show proactive insights?
  const shouldShowProactiveInsights = useCallback((): boolean => {
    if (checkQuietHours(settings)) return false;
    if (settings.globalLevel === "zen") return false;
    return settings.proactiveInsights;
  }, [settings]);

  // Is it currently quiet hours?
  const isInQuietHours = useCallback((): boolean => {
    return checkQuietHours(settings);
  }, [settings]);

  const value: AutonomyContextType = {
    settings,
    loaded,
    updateSettings,
    getLevelForDomain,
    canAutoExecute,
    canSuggest,
    canNotifyProactively,
    shouldShowVoiceGreeting,
    shouldShowProactiveInsights,
    isInQuietHours,
  };

  // Use createElement instead of JSX to avoid parsing issues in .ts file
  return createElement(AutonomyContext.Provider, { value }, children);
}

// ============================================
// HOOK
// ============================================

export function useAutonomy(): AutonomyContextType {
  const context = useContext(AutonomyContext);

  // Return defaults if used outside provider
  if (!context) {
    return {
      settings: DEFAULT_AUTONOMY_SETTINGS,
      loaded: false,
      updateSettings: () => {},
      getLevelForDomain: () => DEFAULT_AUTONOMY_SETTINGS.globalLevel,
      canAutoExecute: () => true,
      canSuggest: () => true,
      canNotifyProactively: () => true,
      shouldShowVoiceGreeting: () => true,
      shouldShowProactiveInsights: () => true,
      isInQuietHours: () => false,
    };
  }

  return context;
}

// ============================================
// STANDALONE HELPER (for non-React contexts like API routes)
// ============================================

export function getAutonomySettings(): AutonomySettings {
  return loadSettings();
}

export function checkCanAutoExecute(domain: DomainKey, isHighStakes = false): boolean {
  const settings = loadSettings();
  if (checkQuietHours(settings)) return false;

  const level = settings.useDomainOverrides ? settings.domains[domain] : settings.globalLevel;
  switch (level) {
    case "jarvis":
      return true;
    case "copilot":
      return !isHighStakes;
    default:
      return false;
  }
}