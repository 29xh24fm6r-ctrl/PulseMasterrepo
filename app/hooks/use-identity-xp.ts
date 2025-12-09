"use client";

import { useCallback } from "react";
import { ArchetypeId } from "@/lib/identity/types";

const IDENTITY_STATE_KEY = "pulse-identity-state";

/**
 * Hook to get active archetype from localStorage
 */
export function useActiveArchetype(): ArchetypeId | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(IDENTITY_STATE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      return state.activeArchetype || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

/**
 * Get active archetype (non-hook version for use in callbacks)
 */
export function getActiveArchetype(): ArchetypeId | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(IDENTITY_STATE_KEY);
    if (saved) {
      const state = JSON.parse(saved);
      return state.activeArchetype || null;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

interface XPResult {
  base: number;
  final: number;
  category: string;
  wasCrit: boolean;
  critMultiplier: number;
  identityBonus: {
    archetype: string;
    amount: number;
    multiplier: number;
  } | null;
}

interface UseIdentityXPReturn {
  activeArchetype: ArchetypeId | null;
  completeTask: (taskId: string, priority: string, taskName?: string) => Promise<XPResult | null>;
  saveJournal: (data: { title?: string; content: string; mood?: string; tags?: string[] }) => Promise<XPResult | null>;
  logHabit: (habitId: string, habitName?: string, date?: string) => Promise<XPResult | null>;
}

/**
 * Hook for identity-aware XP operations
 */
export function useIdentityXP(): UseIdentityXPReturn {
  const activeArchetype = useActiveArchetype();

  const completeTask = useCallback(
    async (taskId: string, priority: string, taskName?: string): Promise<XPResult | null> => {
      try {
        const res = await fetch("/api/tasks/complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            taskId,
            priority,
            taskName,
            activeArchetype: getActiveArchetype(),
          }),
        });
        const data = await res.json();
        return data.ok ? data.xp : null;
      } catch (err) {
        console.error("Failed to complete task:", err);
        return null;
      }
    },
    []
  );

  const saveJournal = useCallback(
    async (data: { title?: string; content: string; mood?: string; tags?: string[] }): Promise<XPResult | null> => {
      try {
        const res = await fetch("/api/journal/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...data,
            activeArchetype: getActiveArchetype(),
          }),
        });
        const result = await res.json();
        return result.ok ? result.xp : null;
      } catch (err) {
        console.error("Failed to save journal:", err);
        return null;
      }
    },
    []
  );

  const logHabit = useCallback(
    async (habitId: string, habitName?: string, date?: string): Promise<XPResult | null> => {
      try {
        const res = await fetch("/api/habits/log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            habitId,
            habitName,
            date,
            activeArchetype: getActiveArchetype(),
          }),
        });
        const data = await res.json();
        return data.ok ? data.xp : null;
      } catch (err) {
        console.error("Failed to log habit:", err);
        return null;
      }
    },
    []
  );

  return {
    activeArchetype,
    completeTask,
    saveJournal,
    logHabit,
  };
}
