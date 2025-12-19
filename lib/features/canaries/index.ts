// lib/features/canaries/index.ts
import "server-only";
import type { CanaryFn } from "../canary.types";
import { tasksCanary } from "./tasks.canary";
import { dealsCanary } from "./deals.canary";
import { contactsCanary } from "./contacts.canary";
import { journalCanary } from "./journal.canary";
import { habitsCanary } from "./habits.canary";
import { intelCanary } from "./intel.canary";
import { jobsCanary } from "./jobs.canary";

export const CANARY_REGISTRY: Record<string, CanaryFn> = {
  tasks: tasksCanary,
  deals: dealsCanary,
  contacts: contactsCanary,
  journal: journalCanary,
  habits: habitsCanary,
  "life-intelligence": intelCanary,
  "scheduler-admin": jobsCanary,
};

export function getCanaryForFeature(featureId: string): CanaryFn | null {
  return CANARY_REGISTRY[featureId] || null;
}

// Aliases for compatibility
export function getCanary(featureId: string): CanaryFn | null {
  return getCanaryForFeature(featureId);
}

export function listCanaryFeatureIds(): string[] {
  return Object.keys(CANARY_REGISTRY);
}

