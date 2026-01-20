export type EnergyLevel = 'Low' | 'Medium' | 'High';
export type StressLevel = 'Low' | 'Medium' | 'High';
export type MomentumLevel = 'Low' | 'Medium' | 'High';

export interface LifeState {
    energy: EnergyLevel;
    stress: StressLevel;
    momentum: MomentumLevel;
    orientation: string; // The single sentence summary
}

export interface TrendPoint {
    day: string;
    value: number; // 0-10 normalized
    label: string;
}

export interface NotableEvent {
    id: string;
    time: string;
    icon: 'zap' | 'shield' | 'brain';
    title: string;
    description: string;
    isGap?: boolean;
}

export interface PlanItem {
    id: string;
    title: string;
    time?: string;
    status: 'pending' | 'approved' | 'declined' | 'completed';
    type: 'task' | 'meeting' | 'routine';
    context?: string;
}

export interface PlanSection {
    id: string;
    title: string;
    items: PlanItem[];
}

// Bridge
export type MessageRole = 'user' | 'pulse' | 'system';

export interface Message {
    id: string;
    role: MessageRole;
    content: string;
    timestamp: Date;
    hasExplanation?: boolean;
}

// Observer
export type RuntimeEvent = {
    id: string;
    timestamp: string;
    type: 'tick' | 'decision' | 'note';
    summary: string;
    detail?: string;
};

export type AutonomyRecord = {
    id: string;
    domain: string;
    action: string;
    eligibility: 'Locked' | 'Confirm' | 'Eligible' | 'Paused';
    confidence: number;
    decay?: number;
    drift?: boolean;
    explainable?: boolean;
};

export type EffectRecord = {
    id: string;
    timestamp: string;
    domain: string;
    action: string;
    status: 'applied' | 'queued' | 'reverted';
    source: 'pulse' | 'you';
    explainable?: boolean;
};

export type IPPEvent = {
    id: string;
    timestamp: string;
    blocker: 'auth' | 'network' | 'data' | 'unknown';
    message: string;
    resolved?: boolean;
};

export type BackgroundJob = {
    id: string;
    timestamp: string;
    job: string;
    status: 'ok' | 'skipped' | 'failed';
    note?: string;
};

export interface ObserverData {
    runtime: RuntimeEvent[];
    autonomy: AutonomyRecord[];
    effects: EffectRecord[];
    ipp: IPPEvent[];
    background: BackgroundJob[];
}
