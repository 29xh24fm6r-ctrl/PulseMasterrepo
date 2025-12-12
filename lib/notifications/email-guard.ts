// Email Guard - Critical Email Risk Detection
// lib/notifications/email-guard.ts

import { getOpenFollowupsForUser } from "@/lib/email/followups";
import { detectBrokenPromises } from "@/lib/email/followups";

/**
 * Check for critical email risks
 */
export async function checkCriticalEmailRisks(userId: string): Promise<{
  urgentFollowups: number;
  overdueFollowups: number;
  brokenPromises: number;
}> {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get urgent followups
  const followups = await getOpenFollowupsForUser(userId, {
    before: tomorrow,
  });

  const overdueFollowups = followups.filter(
    (f) => new Date(f.responseDueAt) < now
  ).length;

  // Detect broken promises
  const brokenPromises = await detectBrokenPromises(userId);

  return {
    urgentFollowups: followups.length,
    overdueFollowups,
    brokenPromises: brokenPromises.length,
  };
}

/**
 * Create notification record for critical risks
 * (For now, just logs. Later can integrate with notification system)
 */
export async function createEmailRiskNotification(
  userId: string,
  risks: { urgentFollowups: number; overdueFollowups: number; brokenPromises: number }
): Promise<void> {
  if (risks.overdueFollowups > 0 || risks.brokenPromises > 0) {
    console.warn(
      `[EmailGuard] Critical risks for user ${userId}: ${risks.overdueFollowups} overdue followups, ${risks.brokenPromises} broken promises`
    );
    // TODO: Create notification record in notifications table when that system exists
  }
}

