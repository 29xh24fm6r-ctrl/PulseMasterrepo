/**
 * Identity Verification for Contact Intelligence
 * Determines if a discovered source matches the contact with confidence scoring
 */

interface ContactFields {
  full_name?: string;
  name?: string;
  primary_email?: string;
  primary_phone?: string;
  company_name?: string;
  title?: string;
  location?: string;
}

interface SourceSignals {
  url: string;
  domain?: string;
  title: string;
  snippet: string;
  pageText?: string; // Optional full page text if fetched
}

interface MatchResult {
  match_score: number; // 0-100
  match_evidence: {
    reasons: string[];
    confidence: 'verified' | 'probable' | 'unverified';
  };
}

/**
 * Score how likely a source is about the given contact
 */
export function scoreIdentityMatch(
  contact: ContactFields,
  source: SourceSignals
): MatchResult {
  const name = contact.full_name || contact.name || '';
  const email = contact.primary_email || '';
  const phone = contact.primary_phone || '';
  const company = contact.company_name || '';
  const title = contact.title || '';
  const location = contact.location || '';

  let score = 0;
  const reasons: string[] = [];

  const searchText = `${source.title} ${source.snippet} ${source.pageText || ''}`.toLowerCase();
  const nameLower = name.toLowerCase();
  const emailLower = email.toLowerCase();
  const phoneClean = phone.replace(/\D/g, '');
  const companyLower = company.toLowerCase();
  const titleLower = title.toLowerCase();
  const locationLower = location.toLowerCase();

  // Exact email match (highest confidence)
  if (email && searchText.includes(emailLower)) {
    score += 90;
    reasons.push('Exact email match');
  }

  // Phone match
  if (phoneClean && phoneClean.length >= 10) {
    const phoneInText = searchText.replace(/\D/g, '');
    if (phoneInText.includes(phoneClean)) {
      score += 85;
      reasons.push('Phone number match');
    }
  }

  // Full name + company match
  if (name && company) {
    if (searchText.includes(nameLower) && searchText.includes(companyLower)) {
      score += 55;
      reasons.push('Full name + company match');
    }
  }

  // Full name + location match
  if (name && location) {
    if (searchText.includes(nameLower) && searchText.includes(locationLower)) {
      score += 35;
      reasons.push('Full name + location match');
    }
  }

  // Full name + title keywords
  if (name && title) {
    const titleWords = titleLower.split(/\s+/).filter(w => w.length > 3);
    const titleMatch = titleWords.some(word => searchText.includes(word));
    if (searchText.includes(nameLower) && titleMatch) {
      score += 25;
      reasons.push('Full name + title keywords match');
    }
  }

  // Domain is company domain
  if (company && source.domain) {
    const companyDomain = companyLower.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
    const sourceDomain = source.domain.toLowerCase();
    if (sourceDomain.includes(companyDomain) || companyDomain.includes(sourceDomain.split('.')[0])) {
      score += 25;
      reasons.push('Company domain match');
    }
  }

  // High-signal profile domains
  const profileDomains = ['wikipedia.org', 'linkedin.com', 'twitter.com', 'x.com', 'crunchbase.com', 'bloomberg.com'];
  if (source.domain && profileDomains.some(d => source.domain?.includes(d))) {
    if (name && searchText.includes(nameLower)) {
      score += 20;
      reasons.push('High-signal profile domain');
    }
  }

  // Penalize common-name ambiguity
  if (name) {
    const nameParts = nameLower.split(/\s+/);
    const firstName = nameParts[0];
    // Common first names (simplified check)
    const commonNames = ['john', 'jane', 'michael', 'sarah', 'david', 'emily', 'james', 'jennifer', 'robert', 'jessica'];
    if (commonNames.includes(firstName) && !company && !title && !location) {
      score -= 30;
      reasons.push('Common name ambiguity (low context)');
    }
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine confidence level
  let confidence: 'verified' | 'probable' | 'unverified';
  if (score >= 80) {
    confidence = 'verified';
  } else if (score >= 60) {
    confidence = 'probable';
  } else {
    confidence = 'unverified';
  }

  return {
    match_score: score,
    match_evidence: {
      reasons,
      confidence,
    },
  };
}

