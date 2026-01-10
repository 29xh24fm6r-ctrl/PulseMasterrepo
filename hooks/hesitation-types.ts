export type EngagementState = 'FLOW' | 'BROWSING' | 'STUCK' | 'AVOIDING' | 'OVERWHELMED';

export interface TelemetryPacket {
    targetId: string | null;
    dwellMs: number;
    hoverCount: number;
    revisitCount: number;
    scrollVelocity: number;
    timestamp: number;
}

export interface HesitationSignal {
    hesitationScore: number;
    avoidanceScore: number;
    state: EngagementState;
    primaryTargetId: string | null;
}
