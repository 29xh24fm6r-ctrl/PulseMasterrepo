/**
 * Duplicate Detection Engine
 * Finds and scores potential duplicate contacts
 */

import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeName, normalizeEmail, normalizePhone, normalizeCompany } from "./normalize";

export interface ContactInput {
  full_name?: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
  company_name?: string | null;
  job_title?: string | null;
}

export interface DuplicateCandidate {
  contact: {
    id: string;
    full_name: string | null;
    primary_email: string | null;
    primary_phone: string | null;
    company_name: string | null;
    title: string | null;
  };
  score: number;
  reasons: string[];
  confidence: "high" | "medium" | "low";
}

export interface MatchScore {
  score: number;
  reasons: string[];
}

/**
 * Find duplicate candidates for a given contact input
 */
export async function findDuplicateCandidates(
  userId: string,
  input: ContactInput
): Promise<DuplicateCandidate[]> {
  const candidates: Map<string, DuplicateCandidate> = new Map();

  const normalizedInput = {
    full_name: normalizeName(input.full_name),
    primary_email: normalizeEmail(input.primary_email),
    primary_phone: normalizePhone(input.primary_phone),
    company_name: normalizeCompany(input.company_name),
    job_title: normalizeName(input.job_title),
  };

  // Search by email (strongest match)
  if (normalizedInput.primary_email) {
    const { data: emailMatches } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, full_name, primary_email, primary_phone, company_name, title")
      .eq("user_id", userId)
      .eq("normalized_email", normalizedInput.primary_email)
      .eq("status", "active")
      .limit(10);

    if (emailMatches) {
      for (const contact of emailMatches) {
        const match = scoreDuplicateCandidate(input, normalizedInput, contact, normalizedInput);
        if (match.score >= 60) {
          // Only include medium or higher confidence
          const existing = candidates.get(contact.id);
          if (!existing || match.score > existing.score) {
            candidates.set(contact.id, {
              contact,
              score: match.score,
              reasons: match.reasons,
              confidence: match.score >= 85 ? "high" : match.score >= 70 ? "medium" : "low",
            });
          }
        }
      }
    }
  }

  // Search by phone (strong match)
  if (normalizedInput.primary_phone && normalizedInput.primary_phone.length >= 10) {
    const { data: phoneMatches } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, full_name, primary_email, primary_phone, company_name, title")
      .eq("user_id", userId)
      .eq("normalized_phone", normalizedInput.primary_phone)
      .eq("status", "active")
      .limit(10);

    if (phoneMatches) {
      for (const contact of phoneMatches) {
        const normalizedContact = {
          full_name: normalizeName(contact.full_name),
          primary_email: normalizeEmail(contact.primary_email),
          primary_phone: normalizePhone(contact.primary_phone),
          company_name: normalizeCompany(contact.company_name),
          job_title: normalizeName(contact.title),
        };

        const match = scoreDuplicateCandidate(input, normalizedInput, contact, normalizedContact);
        if (match.score >= 60) {
          const existing = candidates.get(contact.id);
          if (!existing || match.score > existing.score) {
            candidates.set(contact.id, {
              contact,
              score: match.score,
              reasons: match.reasons,
              confidence: match.score >= 85 ? "high" : match.score >= 70 ? "medium" : "low",
            });
          }
        }
      }
    }
  }

  // Search by name + company (medium match, only if we have both)
  if (normalizedInput.full_name && normalizedInput.company_name) {
    const { data: nameMatches } = await supabaseAdmin
      .from("crm_contacts")
      .select("id, full_name, primary_email, primary_phone, company_name, title")
      .eq("user_id", userId)
      .eq("normalized_full_name", normalizedInput.full_name)
      .eq("status", "active")
      .limit(20);

    if (nameMatches) {
      for (const contact of nameMatches) {
        // Skip if we already found this contact
        if (candidates.has(contact.id)) continue;

        const normalizedContact = {
          full_name: normalizeName(contact.full_name),
          primary_email: normalizeEmail(contact.primary_email),
          primary_phone: normalizePhone(contact.primary_phone),
          company_name: normalizeCompany(contact.company_name),
          job_title: normalizeName(contact.title),
        };

        const match = scoreDuplicateCandidate(input, normalizedInput, contact, normalizedContact);
        if (match.score >= 60) {
          candidates.set(contact.id, {
            contact,
            score: match.score,
            reasons: match.reasons,
            confidence: match.score >= 85 ? "high" : match.score >= 70 ? "medium" : "low",
          });
        }
      }
    }
  }

  // Sort by score descending and return
  return Array.from(candidates.values())
    .filter((c) => c.score >= 60) // Only medium+ confidence
    .sort((a, b) => b.score - a.score);
}

/**
 * Score a duplicate candidate against input
 */
export function scoreDuplicateCandidate(
  input: ContactInput,
  normalizedInput: ReturnType<typeof normalizeInput>,
  candidate: any,
  normalizedCandidate: ReturnType<typeof normalizeInput>
): MatchScore {
  let score = 0;
  const reasons: string[] = [];

  // Strong matches
  if (normalizedInput.primary_email && normalizedCandidate.primary_email) {
    if (normalizedInput.primary_email === normalizedCandidate.primary_email) {
      score += 90;
      reasons.push("email_match");
    }
  }

  if (normalizedInput.primary_phone && normalizedCandidate.primary_phone) {
    if (
      normalizedInput.primary_phone.length >= 10 &&
      normalizedCandidate.primary_phone.length >= 10 &&
      normalizedInput.primary_phone === normalizedCandidate.primary_phone
    ) {
      score += 85;
      reasons.push("phone_match");
    }
  }

  // Medium matches
  if (normalizedInput.full_name && normalizedCandidate.full_name) {
    if (normalizedInput.full_name === normalizedCandidate.full_name) {
      score += 55;
      reasons.push("name_match");
    }
  }

  if (normalizedInput.company_name && normalizedCandidate.company_name) {
    if (normalizedInput.company_name === normalizedCandidate.company_name) {
      score += 20;
      reasons.push("company_match");
    }
  }

  // Weak matches
  if (normalizedInput.job_title && normalizedCandidate.job_title) {
    const inputKeywords = normalizedInput.job_title.split(" ");
    const candidateKeywords = normalizedCandidate.job_title.split(" ");
    const overlap = inputKeywords.filter((kw) => candidateKeywords.includes(kw)).length;
    
    if (overlap > 0) {
      const overlapRatio = overlap / Math.max(inputKeywords.length, candidateKeywords.length);
      score += Math.floor(overlapRatio * 10);
      if (overlapRatio > 0.5) {
        reasons.push("title_overlap");
      }
    }
  }

  // Conflict penalties
  if (normalizedInput.full_name && normalizedCandidate.full_name) {
    if (normalizedInput.full_name !== normalizedCandidate.full_name) {
      // Names differ significantly
      if (!reasons.includes("email_match") && !reasons.includes("phone_match")) {
        // No strong match to override name difference
        score -= 40;
        reasons.push("name_conflict");
      }
    }
  }

  // Ensure score is in bounds
  score = Math.max(0, Math.min(100, score));

  return { score, reasons };
}

/**
 * Normalize all input fields
 */
function normalizeInput(input: ContactInput) {
  return {
    full_name: normalizeName(input.full_name),
    primary_email: normalizeEmail(input.primary_email),
    primary_phone: normalizePhone(input.primary_phone),
    company_name: normalizeCompany(input.company_name),
    job_title: normalizeName(input.job_title),
  };
}

