import { showXPToastGlobal } from "@/app/components/xp-toast";

/**
 * Trigger an XP toast from an API response
 * 
 * Usage:
 * ```
 * const res = await fetch('/api/tasks/complete', { ... });
 * const data = await res.json();
 * if (data.xp) {
 *   triggerXPToast(data.xp);
 * }
 * ```
 */
export function triggerXPToast(xpData: {
  amount?: number;
  category?: string;
  activity?: string;
  wasCrit?: boolean;
  critMultiplier?: number;
}) {
  if (!xpData || !xpData.amount) return;

  showXPToastGlobal({
    amount: xpData.amount,
    category: (xpData.category as any) || "DXP",
    activity: xpData.activity || "Action completed",
    wasCrit: xpData.wasCrit || false,
    critMultiplier: xpData.critMultiplier,
  });
}

/**
 * Trigger XP toast for common activities
 */
export const XPToasts = {
  taskCompleted: (taskName: string, isHighPriority = false, wasCrit = false, critMultiplier?: number) => {
    showXPToastGlobal({
      amount: wasCrit ? (isHighPriority ? 40 : 25) * (critMultiplier || 1) : (isHighPriority ? 40 : 25),
      category: "DXP",
      activity: `Completed: ${taskName}`,
      wasCrit,
      critMultiplier,
    });
  },

  habitLogged: (habitName: string, streak?: number, wasCrit = false, critMultiplier?: number) => {
    showXPToastGlobal({
      amount: wasCrit ? 15 * (critMultiplier || 1) : 15,
      category: "DXP",
      activity: streak ? `${habitName} (${streak} day streak!)` : habitName,
      wasCrit,
      critMultiplier,
    });
  },

  journalSaved: (wasCrit = false, critMultiplier?: number) => {
    showXPToastGlobal({
      amount: wasCrit ? 20 * (critMultiplier || 1) : 20,
      category: "DXP",
      activity: "Journal entry saved",
      wasCrit,
      critMultiplier,
    });
  },

  dealWon: (dealName: string, wasCrit = false, critMultiplier?: number) => {
    showXPToastGlobal({
      amount: wasCrit ? 150 * (critMultiplier || 1) : 150,
      category: "AXP",
      activity: `Deal won: ${dealName}`,
      wasCrit,
      critMultiplier,
    });
  },

  dealAdvanced: (dealName: string, newStage: string) => {
    showXPToastGlobal({
      amount: 50,
      category: "AXP",
      activity: `${dealName} → ${newStage}`,
      wasCrit: false,
    });
  },

  streakMilestone: (habitName: string, days: number) => {
    const xpAmounts: Record<number, number> = { 7: 50, 14: 100, 30: 200, 60: 300, 90: 500, 100: 750 };
    const amount = xpAmounts[days] || 50;
    
    showXPToastGlobal({
      amount,
      category: "MXP",
      activity: `🔥 ${days}-day streak: ${habitName}!`,
      wasCrit: true,
      critMultiplier: 1,
    });
  },

  followUpSent: (contactName: string) => {
    showXPToastGlobal({
      amount: 20,
      category: "DXP",
      activity: `Follow-up sent to ${contactName}`,
      wasCrit: false,
    });
  },

  morningRoutine: () => {
    showXPToastGlobal({
      amount: 30,
      category: "DXP",
      activity: "Morning routine complete",
      wasCrit: false,
    });
  },

  stoicMoment: (description: string, wasCrit = false, critMultiplier?: number) => {
    showXPToastGlobal({
      amount: wasCrit ? 30 * (critMultiplier || 1) : 30,
      category: "IXP",
      activity: description,
      wasCrit,
      critMultiplier,
    });
  },

  boundarySet: (description: string, wasCrit = false, critMultiplier?: number) => {
    showXPToastGlobal({
      amount: wasCrit ? 40 * (critMultiplier || 1) : 40,
      category: "PXP",
      activity: description,
      wasCrit,
      critMultiplier,
    });
  },

  custom: (amount: number, category: "DXP" | "PXP" | "IXP" | "AXP" | "MXP", activity: string, wasCrit = false, critMultiplier?: number) => {
    showXPToastGlobal({
      amount: wasCrit ? amount * (critMultiplier || 1) : amount,
      category,
      activity,
      wasCrit,
      critMultiplier,
    });
  },
};