export type PulseSystemId = 'focus' | 'time' | 'work' | 'people' | 'memory' | 'commitments';

export type SystemStateLevel = 'idle' | 'calm' | 'active' | 'hot' | 'critical';

export interface PulseSystemState {
    id: PulseSystemId;
    level: SystemStateLevel;
    score: number; // 0-100
    confidence: number; // 0-1
    updated_at: string; // ISO date
    signals: {
        key: string;
        value: number;
        source: string;
    }[];
    reasons: {
        label: string;
        severity: 'low' | 'med' | 'high';
        system: PulseSystemId;
    }[];
    recommended_actions: {
        label: string;
        action_id: string;
        system: PulseSystemId;
        cta_type?: 'link' | 'button' | 'toggle';
        cta_payload?: string;
    }[];
}

export interface AttentionItem {
    id: string;
    label: string;
    system: PulseSystemId;
    description?: string;
    severity: 'low' | 'med' | 'high';
}

export interface ExecutionItem {
    id: string;
    title: string;
    system: PulseSystemId;
    due_time?: string;
    severity: SystemStateLevel;
}

export interface NerveCenterState {
    systems: Record<PulseSystemId, PulseSystemState>;
    primary_system: PulseSystemId;
    attention_queue: AttentionItem[];
    execution_lane: ExecutionItem[];
}
