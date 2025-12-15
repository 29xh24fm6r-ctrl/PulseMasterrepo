/**
 * Signal Extraction from Verified Sources
 * Extracts structured signals, facts, and events from discovered sources
 */

interface Source {
  url: string;
  domain?: string;
  title: string;
  snippet: string;
  source_type: string;
  published_at?: string;
  match_score: number;
}

interface ExtractedSignal {
  type: 'role_change' | 'mention' | 'interview' | 'podcast' | 'publication' | 'award' | 'event';
  title: string;
  description: string;
  confidence: number;
  source_url: string;
  occurred_at: string;
}

interface ExtractedFact {
  fact: string;
  category: string;
  confidence: number;
  source_url: string;
}

interface ExtractedEvent {
  event_type: string;
  title: string;
  body: string;
  occurred_at: string;
  source_url: string;
}

interface ExtractionResult {
  signals: ExtractedSignal[];
  facts: ExtractedFact[];
  events: ExtractedEvent[];
}

/**
 * Extract signals, facts, and events from a verified source
 */
export function extractSignals(source: Source): ExtractionResult {
  const signals: ExtractedSignal[] = [];
  const facts: ExtractedFact[] = [];
  const events: ExtractedEvent[] = [];

  const text = `${source.title} ${source.snippet}`.toLowerCase();
  const publishedAt = source.published_at || new Date().toISOString();

  // Detect role changes
  const roleChangePatterns = [
    /\b(joined|appointed|promoted|named|hired|became|elevated to|named as)\b/i,
    /\b(new|current|former)\s+(ceo|cto|cfo|president|director|manager|head of|vp|vice president)\b/i,
  ];

  if (roleChangePatterns.some(p => p.test(text))) {
    signals.push({
      type: 'role_change',
      title: source.title,
      description: source.snippet,
      confidence: source.match_score >= 80 ? 0.8 : 0.6,
      source_url: source.url,
      occurred_at: publishedAt,
    });

    events.push({
      event_type: 'role_change',
      title: source.title,
      body: source.snippet,
      occurred_at: publishedAt,
      source_url: source.url,
    });
  }

  // Detect interviews
  if (text.includes('interview') || text.includes('spoke with') || text.includes('discussed')) {
    signals.push({
      type: 'interview',
      title: source.title,
      description: source.snippet,
      confidence: source.match_score >= 80 ? 0.8 : 0.6,
      source_url: source.url,
      occurred_at: publishedAt,
    });

    events.push({
      event_type: 'interview',
      title: source.title,
      body: source.snippet,
      occurred_at: publishedAt,
      source_url: source.url,
    });
  }

  // Detect podcast appearances
  if (source.source_type === 'podcast' || 
      text.includes('podcast') || 
      text.includes('episode') ||
      source.domain?.includes('spotify') ||
      source.domain?.includes('apple') ||
      source.domain?.includes('soundcloud')) {
    signals.push({
      type: 'podcast',
      title: source.title,
      description: source.snippet,
      confidence: source.match_score >= 80 ? 0.8 : 0.6,
      source_url: source.url,
      occurred_at: publishedAt,
    });

    events.push({
      event_type: 'podcast',
      title: source.title,
      body: source.snippet,
      occurred_at: publishedAt,
      source_url: source.url,
    });
  }

  // Detect publications
  if (text.includes('published') || text.includes('article') || text.includes('wrote') || text.includes('authored')) {
    signals.push({
      type: 'publication',
      title: source.title,
      description: source.snippet,
      confidence: source.match_score >= 80 ? 0.7 : 0.5,
      source_url: source.url,
      occurred_at: publishedAt,
    });
  }

  // Detect awards / recognition
  if (text.includes('award') || text.includes('recognized') || text.includes('honored') || text.includes('featured')) {
    signals.push({
      type: 'award',
      title: source.title,
      description: source.snippet,
      confidence: source.match_score >= 80 ? 0.7 : 0.5,
      source_url: source.url,
      occurred_at: publishedAt,
    });

    events.push({
      event_type: 'award',
      title: source.title,
      body: source.snippet,
      occurred_at: publishedAt,
      source_url: source.url,
    });
  }

  // Extract facts (only from verified sources)
  if (source.match_score >= 80) {
    // Extract company/title facts
    if (text.includes('at ') || text.includes('works at') || text.includes('employed by')) {
      const companyMatch = source.snippet.match(/\bat\s+([A-Z][a-zA-Z\s&]+)/);
      if (companyMatch) {
        facts.push({
          fact: `Works at ${companyMatch[1]}`,
          category: 'business',
          confidence: 0.8,
          source_url: source.url,
        });
      }
    }

    // Extract title/role facts
    const titleMatch = source.snippet.match(/\b(ceo|cto|cfo|president|director|manager|head|vp|vice president|founder|co-founder)\b/i);
    if (titleMatch) {
      facts.push({
        fact: `Role: ${titleMatch[1]}`,
        category: 'business',
        confidence: 0.7,
        source_url: source.url,
      });
    }
  }

  return { signals, facts, events };
}

