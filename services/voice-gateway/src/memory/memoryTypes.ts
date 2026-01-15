export enum MemoryLayer {
    M1_EPHEMERAL = "M1_EPHEMERAL",     // Minutes (Context Window)
    M2_ACTIVE = "M2_ACTIVE",           // Hours-Days (Active Intents)
    M3_CONTINUITY = "M3_CONTINUITY",   // Days-Weeks (Threads)
    M4_IDENTITY = "M4_IDENTITY",       // Weeks-Months (Signals/Vectors)
    M5_NARRATIVE = "M5_NARRATIVE"      // Years (Anchors)
}

export interface NarrativeAnchor {
    anchor_id: string;
    statement: string; // The user-approved wording
    confirmed_at: string; // ISO8601
    confidence: number; // Always 1.0 for anchors (by definition confirmed)
    source_signal_id?: string;
}

export interface MemoryStratificationConfig {
    [MemoryLayer.M1_EPHEMERAL]: { retention: number };
    [MemoryLayer.M2_ACTIVE]: { retention: number };
    [MemoryLayer.M3_CONTINUITY]: { retention: number };
    [MemoryLayer.M4_IDENTITY]: { retention: number };
    [MemoryLayer.M5_NARRATIVE]: { retention: "forever" };
}
