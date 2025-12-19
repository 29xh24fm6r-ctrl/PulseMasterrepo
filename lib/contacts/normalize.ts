/**
 * Contact Data Normalization Helpers
 * Used for duplicate detection and consistent storage
 */

/**
 * Normalize a name for comparison
 * - Trim whitespace
 * - Normalize multiple spaces to single space
 * - Convert to lowercase
 */
export function normalizeName(name?: string | null): string {
  if (!name) return "";
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Normalize an email for comparison
 * - Trim whitespace
 * - Convert to lowercase
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return "";
  return email.trim().toLowerCase();
}

/**
 * Normalize a phone number for comparison
 * - Remove all non-digit characters
 * - Returns digits only (for US/international comparison)
 */
export function normalizePhone(phone?: string | null): string {
  if (!phone) return "";
  return phone.replace(/\D/g, "");
}

/**
 * Normalize company name for comparison
 * - Strip common suffixes (Inc, LLC, Corp, etc.)
 * - Normalize whitespace and case
 */
export function normalizeCompany(company?: string | null): string {
  if (!company) return "";
  
  let normalized = company.trim().toLowerCase();
  
  // Remove common business suffixes
  const suffixes = [
    /\s+inc\.?$/i,
    /\s+llc\.?$/i,
    /\s+corp\.?$/i,
    /\s+corporation$/i,
    /\s+ltd\.?$/i,
    /\s+limited$/i,
    /\s+co\.?$/i,
    /\s+company$/i,
  ];
  
  for (const suffix of suffixes) {
    normalized = normalized.replace(suffix, "");
  }
  
  // Normalize whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  return normalized;
}

