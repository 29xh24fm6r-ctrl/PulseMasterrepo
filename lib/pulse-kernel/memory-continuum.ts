// Pulse Kernel: Memory Continuum
// Deep integration with Second Brain
// Stores patterns, improves predictions, maintains context

import {
  Memory,
  Interaction,
  KnowledgeNode,
  DetectedPattern,
  LearnedPreference,
  RelationshipMemory,
  UserProfile,
} from './types';

/**
 * MEMORY CONTINUUM
 * The persistent memory layer that makes Pulse truly personal
 */
export const memoryContinuum = {
  // In-memory cache (would be backed by database in production)
  _memory: {
    recentInteractions: [],
    knowledgeGraph: [],
    patterns: [],
    preferences: [],
    relationships: [],
  } as Memory,

  /**
   * Initialize memory from storage
   */
  async initialize(userId: string): Promise<Memory> {
    // In production, this would load from Notion/database
    // For now, return in-memory state
    return this._memory;
  },

  /**
   * Record an interaction
   */
  recordInteraction(interaction: Omit<Interaction, 'id'>): Interaction {
    const newInteraction: Interaction = {
      ...interaction,
      id: `int-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    this._memory.recentInteractions.unshift(newInteraction);
    
    // Keep only last 1000 interactions in memory
    if (this._memory.recentInteractions.length > 1000) {
      this._memory.recentInteractions = this._memory.recentInteractions.slice(0, 1000);
    }

    // Trigger pattern detection after recording
    this.detectNewPatterns();

    return newInteraction;
  },

  /**
   * Add or update a knowledge node
   */
  upsertKnowledge(node: Omit<KnowledgeNode, 'lastAccessed' | 'accessCount'>): KnowledgeNode {
    const existing = this._memory.knowledgeGraph.find(n => n.id === node.id);
    
    if (existing) {
      // Update existing
      Object.assign(existing, node);
      existing.lastAccessed = new Date();
      existing.accessCount++;
      return existing;
    } else {
      // Create new
      const newNode: KnowledgeNode = {
        ...node,
        lastAccessed: new Date(),
        accessCount: 1,
      };
      this._memory.knowledgeGraph.push(newNode);
      return newNode;
    }
  },

  /**
   * Record a relationship
   */
  recordRelationship(relationship: RelationshipMemory): void {
    const existing = this._memory.relationships.find(r => r.personId === relationship.personId);
    
    if (existing) {
      // Merge interaction history
      existing.interactionHistory = [
        ...relationship.interactionHistory,
        ...existing.interactionHistory,
      ].slice(0, 100);
      
      // Update other fields
      Object.assign(existing, {
        ...relationship,
        interactionHistory: existing.interactionHistory,
      });
    } else {
      this._memory.relationships.push(relationship);
    }
  },

  /**
   * Get relationship by name (fuzzy match)
   */
  getRelationship(name: string): RelationshipMemory | undefined {
    const nameLower = name.toLowerCase();
    return this._memory.relationships.find(r => 
      r.name.toLowerCase().includes(nameLower) ||
      nameLower.includes(r.name.toLowerCase())
    );
  },

  /**
   * Learn a preference from behavior
   */
  learnPreference(category: string, preference: string, source: string): void {
    const existing = this._memory.preferences.find(
      p => p.category === category && p.preference === preference
    );

    if (existing) {
      // Increase confidence
      existing.confidence = Math.min(1, existing.confidence + 0.1);
      if (!existing.learnedFrom.includes(source)) {
        existing.learnedFrom.push(source);
      }
    } else {
      this._memory.preferences.push({
        category,
        preference,
        confidence: 0.5,
        learnedFrom: [source],
      });
    }
  },

  /**
   * Get preferences for a category
   */
  getPreferences(category: string): LearnedPreference[] {
    return this._memory.preferences
      .filter(p => p.category === category)
      .sort((a, b) => b.confidence - a.confidence);
  },

  /**
   * Detect patterns from interaction history
   */
  detectNewPatterns(): DetectedPattern[] {
    const newPatterns: DetectedPattern[] = [];
    const interactions = this._memory.recentInteractions;

    if (interactions.length < 10) return newPatterns;

    // Time-based patterns
    const timePatterns = this.detectTimePatterns(interactions);
    newPatterns.push(...timePatterns);

    // Behavior patterns
    const behaviorPatterns = this.detectBehaviorPatterns(interactions);
    newPatterns.push(...behaviorPatterns);

    // Emotional patterns
    const emotionalPatterns = this.detectEmotionalPatterns(interactions);
    newPatterns.push(...emotionalPatterns);

    // Merge with existing patterns
    for (const pattern of newPatterns) {
      const existing = this._memory.patterns.find(p => p.id === pattern.id);
      if (existing) {
        existing.confidence = Math.min(1, (existing.confidence + pattern.confidence) / 2 + 0.1);
        existing.occurrences += pattern.occurrences;
        existing.lastSeen = new Date();
      } else {
        this._memory.patterns.push(pattern);
      }
    }

    // Remove low-confidence patterns that haven't been seen recently
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    this._memory.patterns = this._memory.patterns.filter(p => 
      p.confidence >= 0.5 || p.lastSeen > oneWeekAgo
    );

    return newPatterns;
  },

  /**
   * Detect time-based patterns
   */
  detectTimePatterns(interactions: Interaction[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    // Group by hour of day
    const byHour: Record<number, Interaction[]> = {};
    for (const int of interactions) {
      const hour = new Date(int.timestamp).getHours();
      if (!byHour[hour]) byHour[hour] = [];
      byHour[hour].push(int);
    }

    // Find peak activity hours
    const hourCounts = Object.entries(byHour)
      .map(([hour, ints]) => ({ hour: parseInt(hour), count: ints.length }))
      .sort((a, b) => b.count - a.count);

    if (hourCounts.length > 0 && hourCounts[0].count >= 5) {
      const peakHour = hourCounts[0].hour;
      patterns.push({
        id: `time-peak-${peakHour}`,
        type: 'schedule',
        description: `Most active at ${peakHour}:00`,
        confidence: Math.min(0.9, hourCounts[0].count / 20 + 0.3),
        occurrences: hourCounts[0].count,
        lastSeen: new Date(),
        actionable: true,
        suggestedAction: `This is your peak time. Schedule important work around ${peakHour}:00`,
      });
    }

    // Find completion patterns by day of week
    const completions = interactions.filter(i => i.type === 'task_completed');
    const byDay: Record<number, number> = {};
    for (const comp of completions) {
      const day = new Date(comp.timestamp).getDay();
      byDay[day] = (byDay[day] || 0) + 1;
    }

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const bestDay = Object.entries(byDay)
      .sort(([, a], [, b]) => b - a)[0];

    if (bestDay && parseInt(bestDay[1].toString()) >= 5) {
      patterns.push({
        id: `time-productive-day-${bestDay[0]}`,
        type: 'productivity',
        description: `Most productive on ${dayNames[parseInt(bestDay[0])]}s`,
        confidence: 0.7,
        occurrences: parseInt(bestDay[1].toString()),
        lastSeen: new Date(),
        actionable: true,
        suggestedAction: `Schedule challenging tasks on ${dayNames[parseInt(bestDay[0])]}s`,
      });
    }

    return patterns;
  },

  /**
   * Detect behavior patterns
   */
  detectBehaviorPatterns(interactions: Interaction[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    // Procrastination pattern: frequent deferrals
    const deferrals = interactions.filter(i => i.type === 'task_deferred');
    if (deferrals.length >= 5) {
      const deferralRate = deferrals.length / interactions.length;
      if (deferralRate > 0.2) {
        patterns.push({
          id: 'behavior-procrastination',
          type: 'behavior',
          description: 'Tendency to defer tasks frequently',
          confidence: Math.min(0.9, deferralRate + 0.3),
          occurrences: deferrals.length,
          lastSeen: new Date(),
          actionable: true,
          suggestedAction: 'Try "Just Start" mode: commit to just 5 minutes on deferred tasks',
        });
      }
    }

    // Focus pattern: long uninterrupted sessions
    const focusSessions = interactions.filter(i => i.type === 'focus_session');
    const longSessions = focusSessions.filter(i => {
      // Assuming outcome contains duration info
      return i.outcome === 'success';
    });

    if (longSessions.length >= 3) {
      patterns.push({
        id: 'behavior-focus-capable',
        type: 'productivity',
        description: 'Capable of sustained focus when conditions are right',
        confidence: 0.75,
        occurrences: longSessions.length,
        lastSeen: new Date(),
        actionable: true,
        suggestedAction: 'Protect your focus time - you do your best work in uninterrupted blocks',
      });
    }

    // Communication pattern
    const communications = interactions.filter(i => i.type === 'communication');
    const morningComms = communications.filter(c => {
      const hour = new Date(c.timestamp).getHours();
      return hour >= 8 && hour <= 11;
    });

    if (morningComms.length / communications.length > 0.5 && morningComms.length >= 5) {
      patterns.push({
        id: 'behavior-morning-communicator',
        type: 'schedule',
        description: 'You handle communications best in the morning',
        confidence: 0.7,
        occurrences: morningComms.length,
        lastSeen: new Date(),
        actionable: true,
        suggestedAction: 'Batch email/messages in morning, protect afternoon for deep work',
      });
    }

    return patterns;
  },

  /**
   * Detect emotional patterns
   */
  detectEmotionalPatterns(interactions: Interaction[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];

    const withEmotion = interactions.filter(i => i.emotionalContext);
    if (withEmotion.length < 5) return patterns;

    // Stress by time of day
    const stressInteractions = withEmotion.filter(i => 
      i.emotionalContext?.toLowerCase().includes('stress') ||
      i.emotionalContext?.toLowerCase().includes('anxious')
    );

    if (stressInteractions.length >= 3) {
      const afternoonStress = stressInteractions.filter(i => {
        const hour = new Date(i.timestamp).getHours();
        return hour >= 14 && hour <= 17;
      });

      if (afternoonStress.length / stressInteractions.length > 0.5) {
        patterns.push({
          id: 'emotional-afternoon-stress',
          type: 'emotional',
          description: 'Stress tends to peak in the afternoon',
          confidence: 0.7,
          occurrences: afternoonStress.length,
          lastSeen: new Date(),
          actionable: true,
          suggestedAction: 'Schedule a 10-minute break around 3pm to reset',
        });
      }
    }

    return patterns;
  },

  /**
   * Query the knowledge graph
   */
  queryKnowledge(query: {
    type?: string;
    label?: string;
    relatedTo?: string;
  }): KnowledgeNode[] {
    let results = [...this._memory.knowledgeGraph];

    if (query.type) {
      results = results.filter(n => n.type === query.type);
    }

    if (query.label) {
      const labelLower = query.label.toLowerCase();
      results = results.filter(n => n.label.toLowerCase().includes(labelLower));
    }

    if (query.relatedTo) {
      results = results.filter(n => 
        n.connections.some(c => c.nodeId === query.relatedTo)
      );
    }

    return results.sort((a, b) => b.accessCount - a.accessCount);
  },

  /**
   * Build context summary for AI prompts
   */
  buildContextSummary(userProfile: UserProfile): string {
    const parts: string[] = [];

    // User patterns
    const highConfidencePatterns = this._memory.patterns
      .filter(p => p.confidence >= 0.7)
      .slice(0, 5);
    
    if (highConfidencePatterns.length > 0) {
      parts.push('Observed patterns:');
      for (const pattern of highConfidencePatterns) {
        parts.push(`- ${pattern.description}`);
      }
    }

    // Key preferences
    const preferences = this._memory.preferences
      .filter(p => p.confidence >= 0.7)
      .slice(0, 5);
    
    if (preferences.length > 0) {
      parts.push('\nLearned preferences:');
      for (const pref of preferences) {
        parts.push(`- ${pref.category}: ${pref.preference}`);
      }
    }

    // Key relationships
    const keyRelationships = this._memory.relationships
      .filter(r => ['mentor', 'close', 'key_contact', 'manager'].includes(r.relationship))
      .slice(0, 10);
    
    if (keyRelationships.length > 0) {
      parts.push('\nKey relationships:');
      for (const rel of keyRelationships) {
        parts.push(`- ${rel.name} (${rel.relationship})`);
      }
    }

    return parts.join('\n');
  },

  /**
   * Get memory stats
   */
  getStats(): {
    interactions: number;
    knowledgeNodes: number;
    patterns: number;
    preferences: number;
    relationships: number;
  } {
    return {
      interactions: this._memory.recentInteractions.length,
      knowledgeNodes: this._memory.knowledgeGraph.length,
      patterns: this._memory.patterns.length,
      preferences: this._memory.preferences.length,
      relationships: this._memory.relationships.length,
    };
  },

  /**
   * Export memory for backup
   */
  export(): string {
    return JSON.stringify(this._memory, null, 2);
  },

  /**
   * Import memory from backup
   */
  import(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this._memory = {
        recentInteractions: parsed.recentInteractions || [],
        knowledgeGraph: parsed.knowledgeGraph || [],
        patterns: parsed.patterns || [],
        preferences: parsed.preferences || [],
        relationships: parsed.relationships || [],
      };
    } catch (e) {
      console.error('Failed to import memory:', e);
    }
  },

  /**
   * Clear all memory (use with caution)
   */
  clear(): void {
    this._memory = {
      recentInteractions: [],
      knowledgeGraph: [],
      patterns: [],
      preferences: [],
      relationships: [],
    };
  },
};

/**
 * RELATIONSHIP TRACKER
 * Specialized functions for tracking people
 */
export const relationshipTracker = {
  /**
   * Log an interaction with a person
   */
  logInteraction(
    personId: string,
    personName: string,
    type: 'email' | 'meeting' | 'call' | 'message' | 'in_person',
    sentiment: 'positive' | 'neutral' | 'negative' = 'neutral'
  ): void {
    const existing = memoryContinuum._memory.relationships.find(r => r.personId === personId);
    
    const interaction = {
      date: new Date(),
      type,
      sentiment,
    };

    if (existing) {
      existing.interactionHistory.unshift(interaction);
      if (existing.interactionHistory.length > 100) {
        existing.interactionHistory = existing.interactionHistory.slice(0, 100);
      }
    } else {
      memoryContinuum._memory.relationships.push({
        personId,
        name: personName,
        relationship: 'contact',
        interactionHistory: [interaction],
        preferences: {},
        importantDates: [],
        communicationStyle: '',
      });
    }
  },

  /**
   * Get people needing attention (no recent contact)
   */
  getPeopleNeedingAttention(daysSinceContact: number = 30): RelationshipMemory[] {
    const cutoff = new Date(Date.now() - daysSinceContact * 24 * 60 * 60 * 1000);
    
    return memoryContinuum._memory.relationships.filter(r => {
      if (r.interactionHistory.length === 0) return true;
      const lastContact = new Date(r.interactionHistory[0].date);
      return lastContact < cutoff;
    });
  },

  /**
   * Get upcoming important dates
   */
  getUpcomingImportantDates(daysAhead: number = 14): {
    person: RelationshipMemory;
    event: { date: string; description: string };
    daysUntil: number;
  }[] {
    const results: {
      person: RelationshipMemory;
      event: { date: string; description: string };
      daysUntil: number;
    }[] = [];

    const now = new Date();

    for (const person of memoryContinuum._memory.relationships) {
      for (const importantDate of person.importantDates) {
        const eventDate = new Date(importantDate.date);
        // Set to this year
        eventDate.setFullYear(now.getFullYear());
        
        // If already passed this year, check next year
        if (eventDate < now) {
          eventDate.setFullYear(now.getFullYear() + 1);
        }

        const daysUntil = Math.floor((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil >= 0 && daysUntil <= daysAhead) {
          results.push({ person, event: importantDate, daysUntil });
        }
      }
    }

    return results.sort((a, b) => a.daysUntil - b.daysUntil);
  },
};
