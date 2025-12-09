// Contact Scoring System

export interface ContactScore {
  contactId: string;
  totalScore: number; // 0-100
  breakdown: {
    engagement: number; // 0-25 - How often you interact
    recency: number; // 0-25 - How recently you interacted
    dealValue: number; // 0-25 - Associated deal value
    relationship: number; // 0-25 - Relationship strength
  };
  tier: ContactTier;
  trend: "rising" | "stable" | "declining";
  lastCalculated: string;
}

export type ContactTier = "platinum" | "gold" | "silver" | "bronze" | "inactive";

export interface ScoringFactors {
  emailsSent: number;
  emailsReceived: number;
  meetingsHeld: number;
  lastContactDate: string | null;
  dealValue: number;
  dealsClosed: number;
  dealsInProgress: number;
  relationshipLevel: RelationshipLevel;
  notes: number;
  tags: string[];
}

export type RelationshipLevel = "stranger" | "acquaintance" | "contact" | "connection" | "friend" | "close";

export const TIER_CONFIG: Record<ContactTier, { label: string; color: string; min: number; icon: string }> = {
  platinum: { label: "Platinum", color: "#a855f7", min: 80, icon: "💎" },
  gold: { label: "Gold", color: "#f59e0b", min: 60, icon: "🥇" },
  silver: { label: "Silver", color: "#94a3b8", min: 40, icon: "🥈" },
  bronze: { label: "Bronze", color: "#cd7f32", min: 20, icon: "🥉" },
  inactive: { label: "Inactive", color: "#6b7280", min: 0, icon: "💤" },
};

export const RELATIONSHIP_SCORES: Record<RelationshipLevel, number> = {
  stranger: 0,
  acquaintance: 5,
  contact: 10,
  connection: 15,
  friend: 20,
  close: 25,
};

// Calculate engagement score (0-25)
export function calculateEngagementScore(factors: ScoringFactors): number {
  const emailScore = Math.min((factors.emailsSent + factors.emailsReceived) * 2, 15);
  const meetingScore = Math.min(factors.meetingsHeld * 5, 10);
  return Math.min(emailScore + meetingScore, 25);
}

// Calculate recency score (0-25)
export function calculateRecencyScore(lastContactDate: string | null): number {
  if (!lastContactDate) return 0;
  
  const daysSince = Math.floor(
    (Date.now() - new Date(lastContactDate).getTime()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysSince <= 7) return 25;
  if (daysSince <= 14) return 20;
  if (daysSince <= 30) return 15;
  if (daysSince <= 60) return 10;
  if (daysSince <= 90) return 5;
  return 0;
}

// Calculate deal value score (0-25)
export function calculateDealScore(factors: ScoringFactors): number {
  let score = 0;
  
  // Value-based scoring
  if (factors.dealValue >= 100000) score += 15;
  else if (factors.dealValue >= 50000) score += 12;
  else if (factors.dealValue >= 25000) score += 9;
  else if (factors.dealValue >= 10000) score += 6;
  else if (factors.dealValue > 0) score += 3;
  
  // Activity-based scoring
  score += Math.min(factors.dealsClosed * 3, 6);
  score += Math.min(factors.dealsInProgress * 2, 4);
  
  return Math.min(score, 25);
}

// Calculate relationship score (0-25)
export function calculateRelationshipScore(factors: ScoringFactors): number {
  let score = RELATIONSHIP_SCORES[factors.relationshipLevel] || 0;
  
  // Bonus for notes and tags
  score += Math.min(factors.notes * 2, 5);
  
  return Math.min(score, 25);
}

// Calculate total score and tier
export function calculateContactScore(factors: ScoringFactors): ContactScore {
  const engagement = calculateEngagementScore(factors);
  const recency = calculateRecencyScore(factors.lastContactDate);
  const dealValue = calculateDealScore(factors);
  const relationship = calculateRelationshipScore(factors);
  
  const totalScore = engagement + recency + dealValue + relationship;
  
  let tier: ContactTier = "inactive";
  if (totalScore >= 80) tier = "platinum";
  else if (totalScore >= 60) tier = "gold";
  else if (totalScore >= 40) tier = "silver";
  else if (totalScore >= 20) tier = "bronze";
  
  return {
    contactId: "",
    totalScore,
    breakdown: { engagement, recency, dealValue, relationship },
    tier,
    trend: "stable", // Would be calculated from historical data
    lastCalculated: new Date().toISOString(),
  };
}

// Get score color based on value
export function getScoreColor(score: number): string {
  if (score >= 80) return "#a855f7"; // Purple
  if (score >= 60) return "#f59e0b"; // Amber
  if (score >= 40) return "#94a3b8"; // Gray
  if (score >= 20) return "#cd7f32"; // Bronze
  return "#6b7280"; // Dark gray
}

// Get trend icon
export function getTrendIcon(trend: ContactScore["trend"]): string {
  switch (trend) {
    case "rising": return "📈";
    case "declining": return "📉";
    default: return "➡️";
  }
}
