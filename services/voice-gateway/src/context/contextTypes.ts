export enum UserMode {
    CALM = 'CALM',
    FOCUSED = 'FOCUSED',
    STRESSED = 'STRESSED',
    URGENT = 'URGENT'
}

export enum ConfirmationStyle {
    DIRECT = 'direct',   // "Done."
    GENTLE = 'gentle',   // "I've taken care of that for you."
    MINIMAL = 'minimal'  // "OK."
}

export enum Verbosity {
    TIGHT = 'tight',
    NORMAL = 'normal'
}

export interface ModeState {
    current: UserMode;
    confidence: number;
    reasons: string[]; // Explanability
    lastUpdated: number;
}

export interface VoicePreferences {
    voiceProfileId: string;
    confirmationStyle: ConfirmationStyle;
    verbosity: Verbosity;
}

export interface Utterance {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

export interface IntentRecord {
    intent: string;
    params: Record<string, any>;
    confidence: number;
    suggested: boolean;
    confirmed: boolean;
    timestamp: number;
}

// Minimal tool result record
export interface ToolResultRecord {
    toolName: string;
    status: 'success' | 'error';
    data: any;
    timestamp: number;
}

export interface ResolvedEntity {
    type: 'person' | 'time' | 'item' | 'location';
    value: string;
    originalText: string;
    confidence: number;
    timestamp: number;
}

export interface CallContext {
    callId: string;
    startTime: number;
    lastActivity: number;

    // User State
    mode: ModeState;
    preferences: VoicePreferences;

    // History (N=10)
    utterances: Utterance[];
    recentIntents: IntentRecord[];
    recentToolResults: ToolResultRecord[];

    // Knowledge
    resolvedEntities: ResolvedEntity[];

    // Pending State
    pendingConfirmation?: {
        intent: string;
        params: any;
        timestamp: number;
    };
}

export type ContextPatch = Partial<Omit<CallContext, 'callId' | 'utterances' | 'recentIntents' | 'recentToolResults'>>;
