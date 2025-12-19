/**
 * Entity Resolution Scoring
 * Determines if a web search result matches the contact
 */

import { IdentityCard } from "./identity";

export interface CandidateMatch {
  url: string;
  title: string;
  snippet: string;
  publisher?: string;
}

export interface ResolutionResult {
  score: number; // 0-100
  status: "verified" | "likely" | "uncertain" | "rejected";
  evidence: {
    matched: string[];
    conflicts: string[];
    excerpts: string[];
  };
}

const SCORE_WEIGHTS = {
  companyMatch: 40,
  titleMatch: 25,
  locationMatch: 15,
  keywordOverlap: 10,
  conflictPenalty: -50,
};

const THRESHOLDS = {
  verified: 85,
  likely: 70,
  uncertain: 40,
};

/**
 * Score a candidate search result against an identity card
 */
export function scoreCandidate(
  identity: IdentityCard,
  candidate: CandidateMatch
): ResolutionResult {
  let score = 0;
  const matched: string[] = [];
  const conflicts: string[] = [];
  const excerpts: string[] = [];

  const searchText = `${candidate.title} ${candidate.snippet} ${candidate.publisher || ""}`.toLowerCase();
  const nameParts = [identity.firstName, identity.lastName, identity.name].filter(Boolean) as string[];

  // Company match (name or domain)
  if (identity.companyName) {
    const companyLower = identity.companyName.toLowerCase();
    if (searchText.includes(companyLower)) {
      score += SCORE_WEIGHTS.companyMatch;
      matched.push("company");
      excerpts.push(`Company mentioned: "${identity.companyName}"`);
    }

    // Domain match
    if (identity.companyDomain && candidate.url) {
      const urlLower = candidate.url.toLowerCase();
      if (urlLower.includes(identity.companyDomain)) {
        score += SCORE_WEIGHTS.companyMatch * 0.5; // Partial score for domain
        matched.push("company_domain");
      }
    }
  }

  // Title/job match
  if (identity.jobTitle) {
    const titleLower = identity.jobTitle.toLowerCase();
    const titleKeywords = extractKeywords(titleLower);
    
    let titleMatches = 0;
    titleKeywords.forEach((keyword) => {
      if (searchText.includes(keyword)) {
        titleMatches++;
      }
    });

    if (titleMatches > 0) {
      const titleScore = (titleMatches / titleKeywords.length) * SCORE_WEIGHTS.titleMatch;
      score += titleScore;
      matched.push("title");
      excerpts.push(`Job title mentioned: "${identity.jobTitle}"`);
    }
  }

  // Name match (must have at least last name or full name)
  let nameMatches = 0;
  if (identity.lastName) {
    const lastNameLower = identity.lastName.toLowerCase();
    if (searchText.includes(lastNameLower)) {
      nameMatches++;
      matched.push("last_name");
    }
  }

  if (identity.firstName) {
    const firstNameLower = identity.firstName.toLowerCase();
    if (searchText.includes(firstNameLower)) {
      nameMatches++;
      if (!matched.includes("last_name")) {
        matched.push("first_name");
      }
    }
  }

  // Require name match for any confidence
  if (nameMatches === 0 && identity.name) {
    const nameLower = identity.name.toLowerCase();
    if (searchText.includes(nameLower)) {
      nameMatches = 2; // Full name match counts as both
      matched.push("full_name");
    }
  }

  // Penalize if name doesn't match at all
  if (nameMatches === 0) {
    score -= 30; // Heavy penalty
    conflicts.push("name_not_found");
  }

  // Location match
  if (identity.location) {
    const locationLower = identity.location.toLowerCase();
    if (searchText.includes(locationLower)) {
      score += SCORE_WEIGHTS.locationMatch;
      matched.push("location");
    }
  }

  // Keyword overlap
  if (identity.keywords && identity.keywords.length > 0) {
    const keywordMatches = identity.keywords.filter((keyword) =>
      searchText.includes(keyword.toLowerCase())
    ).length;
    
    if (keywordMatches > 0) {
      const keywordScore = (keywordMatches / identity.keywords.length) * SCORE_WEIGHTS.keywordOverlap;
      score += keywordScore;
      matched.push("keywords");
    }
  }

  // Conflict detection
  // Check for conflicting names (e.g., "John Smith" but result mentions "Jane Smith")
  if (identity.lastName) {
    const lastNameLower = identity.lastName.toLowerCase();
    const namePattern = new RegExp(`\\b([a-z]+)\\s+${lastNameLower}\\b`, "i");
    const matches = searchText.match(namePattern);
    
    if (matches && identity.firstName) {
      const foundFirstName = matches[1].toLowerCase();
      if (foundFirstName !== identity.firstName.toLowerCase()) {
        score += SCORE_WEIGHTS.conflictPenalty;
        conflicts.push(`name_conflict: found "${matches[1]}" instead of "${identity.firstName}"`);
      }
    }
  }

  // Determine status
  let status: ResolutionResult["status"];
  if (score >= THRESHOLDS.verified) {
    status = "verified";
  } else if (score >= THRESHOLDS.likely) {
    status = "likely";
  } else if (score >= THRESHOLDS.uncertain) {
    status = "uncertain";
  } else {
    status = "rejected";
  }

  // Ensure score is within bounds
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    status,
    evidence: {
      matched,
      conflicts,
      excerpts: excerpts.slice(0, 5), // Limit excerpts
    },
  };
}

/**
 * Extract keywords from a job title
 */
function extractKeywords(text: string): string[] {
  // Remove common stopwords and extract meaningful terms
  const stopwords = new Set(["the", "of", "and", "a", "an", "in", "on", "at", "to", "for"]);
  
  return text
    .split(/\s+/)
    .map((word) => word.replace(/[^a-z0-9]/gi, ""))
    .filter((word) => word.length > 2 && !stopwords.has(word.toLowerCase()));
}

