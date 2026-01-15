
/**
 * Pulse Memory System - Types
 * lib/memory/types.ts
 */

export type MemoryLayer =
    | 'M1_Context'    // Immediate sensory buffer / working memory (volatile)
    | 'M2_ShortTerm'  // Recent specific events (days/weeks)
    | 'M3_LongTerm'   // Consolidated facts & patterns (months/years)
    | 'M4_Identity'   // Self-concept, trajectory, recurrent themes
    | 'M5_Core';      // Fundamental truths, anchors, prime directives (immutable)

export type MemoryType =
    | "fact"
    | "preference"
    | "pattern"
    | "insight"
    | "decision"
    | "goal"
    | "relationship"
    | "event"
    | "feedback"
    | "narrative_anchor" // New for M5
    | "identity_snapshot"; // New for M4 (Phase 8)

export interface Memory {
    id: string;
    userId: string;
    type: MemoryType;
    layer: MemoryLayer; // Stratification
    category: string;
    content: string;
    context?: string;
    importance: number; // 1-10
    embedding?: number[];
    tags: string[];
    source?: string;
    sourceId?: string;
    expiresAt?: Date;
    accessCount: number;
    lastAccessedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    meta: Record<string, any>; // Flexible metadata
}

export interface MemoryPattern {
    id: string;
    userId: string;
    patternType: string;
    description: string;
    frequency: number;
    confidence: number;
    lastOccurred: Date;
    data: Record<string, any>;
}

export interface MemoryContext {
    relevantMemories: Memory[];
    patterns: MemoryPattern[];
    summary: string;
}
