// types/agi.ts

/**
 * Client-safe AGI types.
 * IMPORTANT:
 * - This file must contain ONLY types/interfaces/zod schemas that do not import server-only modules.
 * - Never import from "@/lib/agi/*" here.
 * - These types are safe to import in client components.
 */

export type AGIUserProfile = {
  userId: string;
  priorities: Record<string, boolean>;
  capabilities: Record<string, boolean>;
  autonomyStyle: "conservative" | "balanced" | "proactive";
  rituals: Record<string, any>;
  focusAreas: string[];
  tone: string;
  notificationPreferences: Record<string, boolean>;
  predictiveAssistance: boolean;
  hardLimits: Record<string, boolean>;
};

