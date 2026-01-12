import {
    NerveInput,
    TaskLite,
    CalendarLite
} from './input';
import {
    NerveCenterState,
    PulseSystemId,
    PulseSystemState,
    SystemStateLevel,
    ExecutionItem,
    AttentionItem
} from './types';

// --- Constants & Thresholds ---

const LEVEL_THRESHOLDS: Record<string, [number, number]> = {
    idle: [0, 9],
    calm: [10, 34],
    active: [35, 59],
    hot: [60, 79],
    critical: [80, 100],
};

const SYSTEMS: PulseSystemId[] = ['focus', 'time', 'work', 'people', 'memory', 'commitments'];

// --- Helper Functions ---

function getLevel(score: number): SystemStateLevel {
    if (score >= 80) return 'critical';
    if (score >= 60) return 'hot';
    if (score >= 35) return 'active';
    if (score >= 10) return 'calm';
    return 'idle';
}

function calculateConfidence(input: NerveInput): number {
    let confidence = 0.4; // Base confidence
    if (input.tasks.length > 0) confidence += 0.2;
    if (input.calendar.length > 0) confidence += 0.2;
    if (input.crm.length > 0) confidence += 0.1;
    if (input.biometrics) confidence += 0.1;
    return Math.min(confidence, 1.0);
}

// System-specific Scoring Logic

function scoreFocus(input: NerveInput): number {
    let score = 50; // default neutral
    if (!input.biometrics) return score; // fallback

    // Biometrics drive focus directly if available
    if (input.biometrics.focus_score) {
        score = input.biometrics.focus_score;
    }

    return score;
}

function scoreTime(input: NerveInput): number {
    const now = new Date(input.now).getTime();
    let score = 20; // default calm

    // Check ongoing or upcoming events
    const busy = input.calendar.some(event => {
        const start = new Date(event.start_time).getTime();
        const end = new Date(event.end_time).getTime();
        return (now >= start && now <= end) || (start - now > 0 && start - now < 30 * 60 * 1000);
    });

    if (busy) score = 70;

    return score;
}

function scoreWork(input: NerveInput): number {
    // Driven by high priority tasks count
    const p1Count = input.tasks.filter(t => t.priority === 'p1').length;
    if (p1Count > 5) return 85; // critical
    if (p1Count > 2) return 65; // hot
    if (p1Count > 0) return 45; // active
    return 20; // calm
}

function scorePeople(input: NerveInput): number {
    // Driven by CRM actions needed
    // Placeholder logic
    const overdueCRM = input.crm.length;
    if (overdueCRM > 3) return 80;
    if (overdueCRM > 0) return 50;
    return 15;
}

function scoreMemory(input: NerveInput): number {
    // Driven by recent notes or knowledge gaps
    // Placeholder: "active" if recently taking notes
    if (input.notes.length > 5) return 60; // hot/processing
    return 10;
}

function scoreCommitments(input: NerveInput): number {
    // Overall task volume
    const total = input.tasks.length;
    if (total > 20) return 75;
    if (total > 10) return 50;
    return 25;
}


// --- Main Mapper ---

export function mapNerveCenterState(input: NerveInput): NerveCenterState {

    // 1. Calculate Global Confidence
    const confidence = calculateConfidence(input);

    // 2. Score Each System
    const systemScores: Record<PulseSystemId, number> = {
        focus: scoreFocus(input),
        time: scoreTime(input),
        work: scoreWork(input),
        people: scorePeople(input),
        memory: scoreMemory(input),
        commitments: scoreCommitments(input),
    };

    // 3. Build System States
    const systems: Partial<Record<PulseSystemId, PulseSystemState>> = {};

    let primaryId: PulseSystemId = 'focus';
    let maxScore = -1;

    SYSTEMS.forEach(id => {
        const score = systemScores[id];
        let level = getLevel(score);

        // Confidence dampener: cannot be critical if confidence is low
        if (confidence < 0.5 && level === 'critical') {
            level = 'hot';
        }

        // Determine primary system (simple max score)
        if (score > maxScore) {
            maxScore = score;
            primaryId = id;
        }

        // Generate basic reasons/actions based on level (Placeholders for now)
        const reasons = [];
        const actions = [];

        if (level === 'critical' || level === 'hot') {
            reasons.push({ label: 'High Activity Detected', severity: 'high', system: id });
            actions.push({ label: 'Review Status', action_id: 'review', system: id, cta_type: 'button' });
        }

        // @ts-ignore - TS struggles with specific enum keys in disjoint definition, will fix structure
        systems[id] = {
            id,
            level,
            score,
            confidence,
            updated_at: input.now,
            signals: [],
            reasons: reasons as any,
            recommended_actions: actions as any,
        };
    });

    // 4. Build Execution Lane
    // Filter top 5 P1 items
    const execution_lane: ExecutionItem[] = input.tasks
        .filter(t => t.priority === 'p1')
        .slice(0, 5)
        .map(t => ({
            id: t.id,
            title: t.title,
            system: 'work', // default attribution
            due_time: t.due_date ? new Date(t.due_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined,
            severity: 'hot'
        }));

    // If empty, fill with a placeholder
    if (execution_lane.length === 0) {
        // Keep empty to let UI handle "Flow State Active"
    }

    // 5. Build Attention Queue (Secondary alerts)
    const attention_queue: AttentionItem[] = []; // Populate later logic

    return {
        systems: systems as Record<PulseSystemId, PulseSystemState>,
        primary_system: primaryId,
        attention_queue,
        execution_lane
    };
}
