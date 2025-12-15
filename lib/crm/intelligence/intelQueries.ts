/**
 * Query Generation for Deep Contact Intelligence
 * Generates search query packs for external OSINT discovery
 */

interface ContactFields {
  full_name?: string;
  name?: string;
  primary_email?: string;
  company_name?: string;
  title?: string;
  location?: string;
}

interface QueryPack {
  query: string;
  category: 'identity' | 'news' | 'podcast' | 'social' | 'professional';
  freshness?: 'pd' | 'pw' | 'pm' | 'py';
}

/**
 * Generate query pack for deep intel discovery
 */
export function generateIntelQueries(contact: ContactFields): QueryPack[] {
  const name = contact.full_name || contact.name || '';
  const email = contact.primary_email || '';
  const company = contact.company_name || '';
  const title = contact.title || '';
  const location = contact.location || '';

  if (!name) {
    return []; // Can't search without a name
  }

  const queries: QueryPack[] = [];

  // Core identity queries
  if (company) {
    queries.push({
      query: `"${name}" "${company}"`,
      category: 'identity',
    });
  }

  if (title && company) {
    queries.push({
      query: `"${name}" "${title}" "${company}"`,
      category: 'identity',
    });
  }

  // Email domain (only if safe to use)
  if (email && email.includes('@')) {
    const domain = email.split('@')[1];
    // Only use if it's a company domain (not gmail, etc)
    const personalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'me.com'];
    if (!personalDomains.includes(domain.toLowerCase())) {
      queries.push({
        query: `"${name}" ${domain}`,
        category: 'identity',
      });
    }
  }

  // News / press
  queries.push({
    query: `"${name}" interview`,
    category: 'news',
    freshness: 'py',
  });

  queries.push({
    query: `"${name}" press release`,
    category: 'news',
    freshness: 'py',
  });

  if (company) {
    queries.push({
      query: `"${company}" "${name}"`,
      category: 'news',
      freshness: 'py',
    });
  }

  // Podcasts / audio
  queries.push({
    query: `"${name}" podcast`,
    category: 'podcast',
    freshness: 'py',
  });

  queries.push({
    query: `"${name}" guest`,
    category: 'podcast',
    freshness: 'py',
  });

  if (company) {
    queries.push({
      query: `"${name}" "${company}" podcast`,
      category: 'podcast',
      freshness: 'py',
    });
  }

  // Social (public only)
  if (company) {
    queries.push({
      query: `"${name}" "${company}" twitter`,
      category: 'social',
      freshness: 'pm',
    });

    queries.push({
      query: `"${name}" "${company}" linkedin`,
      category: 'social',
      freshness: 'pm',
    });
  }

  // Professional footprint
  queries.push({
    query: `"${name}" speaker`,
    category: 'professional',
    freshness: 'py',
  });

  queries.push({
    query: `"${name}" conference`,
    category: 'professional',
    freshness: 'py',
  });

  queries.push({
    query: `"${name}" publication`,
    category: 'professional',
    freshness: 'py',
  });

  return queries;
}

