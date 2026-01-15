import {
    NowResult,
    SignalBundle,
    Candidate,
    RecommendedAction,
    Timestamp
} from './types';

// Tunables
const CONFIDENCE_THRESHOLD = 0.60;
const MARGIN_TO_AVOID_TIES = 0.12;
const MAX_REASONS = 3;
const MIN_REASONS = 1;

// Score weights
const W_URGENCY = 0.30;
const W_BLOCKEDNESS = 0.22;
const W_RECENCY = 0.18;
const W_LEVERAGE = 0.18;
const W_USER_INTENT = 0.12;

// Decay
const IGNORE_DECAY_PER_IGNORE = 0.15;
const IGNORE_DECAY_CAP = 0.45;
const DEFER_COOLDOWN_HOURS = 24;

// --- Core ---

export function computeNow(bundle: SignalBundle): NowResult {
    // 0) Guard: respect explicit "defer now"
    const deferredResult = checkDeferredState(bundle);
    if (deferredResult) return deferredResult;

    // 1) Build candidates
    const candidates = buildCandidates(bundle);

    // 2) If nothing actionable
    if (candidates.length === 0) {
        return {
            status: "no_clear_now",
            explanation: "No actionable focus detected. Capture intent or start a session.",
            fallback_action: {
                label: "Start a new session",
                action_type: "advance",
                payload: { route: "/chat", intent: "new" }
            }
        };
    }

    // 3) Score candidates
    for (const c of candidates) {
        const features = extractFeatures(c, bundle);
        let score = weightedScore(features);
        c.score = applyIgnoreDecay(c, bundle, score);
        c.reasons = deriveReasons(features, bundle, c);
        c.explanation = {
            drivers: c.reasons,
            suppressors: [] // TODO: Implement suppressors (e.g. "Low Energy", "Too Soon")
        };
        c.recommended_action = deriveAction(c, features, bundle);
    }

    // 4) Rank
    candidates.sort((a, b) => b.score - a.score);
    const top = candidates[0];
    const runnerUp = candidates.length > 1 ? candidates[1] : null;

    // 5) Compute confidence
    top.confidence = computeConfidence(top, runnerUp, bundle);

    // 6) Enforce Singularity & Threshold
    if (top.confidence < CONFIDENCE_THRESHOLD) {
        return noClearNowResult(bundle);
    }

    if (runnerUp) {
        const gap = top.score - runnerUp.score;
        if (gap < MARGIN_TO_AVOID_TIES) {
            return noClearNowResult(bundle);
        }
    }

    // 7) Finalize reasons
    top.reasons = clampReasons(top.reasons, MIN_REASONS, MAX_REASONS);

    // 8) Compute Futures (Phase L)
    const futures = candidates
        .slice(1, 4) // Next 3
        .map(c => ({
            id: c.ref_id,
            title: c.title,
            confidence: c.confidence || 0.5,
            horizon: "next" as const, // Simplification for now, could be calculated
            original_candidate: c
        }));

    return {
        status: "resolved_now",
        primary_focus: top,
        confidence_score: top.confidence,
        supporting_reasons: top.reasons,
        recommended_action: top.recommended_action,
        futures
    };
}

// --- Helpers ---

function checkDeferredState(bundle: SignalBundle): NowResult | null {
    // Find last "DEFER_NOW" user event
    const event = bundle.user_events.find(e => e.type === "DEFER_NOW");
    if (!event) return null;

    const now = getTimestamp(bundle.now);
    const eventTime = getTimestamp(event.timestamp);
    const cooldownUntil = eventTime + (DEFER_COOLDOWN_HOURS * 60 * 60 * 1000);

    if (now < cooldownUntil) {
        return {
            status: "deferred",
            last_known_focus: event.payload?.last_focus_candidate,
            cooldown_until: cooldownUntil
        };
    }
    return null;
}

function buildCandidates(bundle: SignalBundle): Candidate[] {
    const list: Candidate[] = [];

    // A) Actions
    for (const a of bundle.actions) {
        if (['open', 'in_progress', 'active'].includes(a.status)) {
            // Should filter for actionable? Assuming adapter handled basic filters
            list.push({
                key: `action:${a.id}`,
                kind: 'action',
                title: a.title,
                ref_id: a.id,
                context_tags: a.project ? [a.project] : [],
                score: 0, confidence: 0, reasons: [], recommended_action: {} as any
            });
        }
    }

    // B) Decisions
    for (const d of bundle.decisions) {
        if (d.status === 'unresolved') {
            list.push({
                key: `decision:${d.id}`,
                kind: 'decision',
                title: d.title,
                ref_id: d.id,
                context_tags: ['Decision'],
                score: 0, confidence: 0, reasons: [], recommended_action: {} as any
            });
        }
    }

    // C) Blockers
    for (const b of bundle.blockers) {
        if (b.status === 'active') {
            list.push({
                key: `blocker:${b.id}`,
                kind: 'blocker',
                title: `Blocker: ${b.title}`,
                ref_id: b.id,
                context_tags: ['Blocker'],
                score: 0, confidence: 0, reasons: [], recommended_action: {} as any
            });
        }
    }

    // D) Sessions
    for (const s of bundle.sessions) {
        // Assuming adapter provides status
        list.push({
            key: `session:${s.id}`,
            kind: 'session',
            title: s.title || "Active Session",
            ref_id: s.id,
            context_tags: ['Session'],
            score: 0, confidence: 0, reasons: [], recommended_action: {} as any
        });
    }

    // Filter & Dedupe logic would go here if needed
    return list;
}

type Features = {
    urgency: number;
    blockedness: number;
    recency: number;
    leverage: number;
    user_intent: number;
};

function extractFeatures(c: Candidate, bundle: SignalBundle): Features {
    return {
        urgency: computeUrgency(c, bundle),
        blockedness: computeBlockedness(c, bundle),
        recency: computeRecency(c, bundle),
        leverage: computeLeverage(c, bundle),
        user_intent: computeUserIntent(c, bundle)
    };
}

function weightedScore(f: Features): number {
    return (W_URGENCY * f.urgency) +
        (W_BLOCKEDNESS * f.blockedness) +
        (W_RECENCY * f.recency) +
        (W_LEVERAGE * f.leverage) +
        (W_USER_INTENT * f.user_intent);
}

function applyIgnoreDecay(c: Candidate, bundle: SignalBundle, score: number): number {
    const ignoreRecord = bundle.ignored_candidates.find(i => i.key === c.key);
    const ignores = ignoreRecord ? ignoreRecord.count : 0;
    const penalty = Math.min(IGNORE_DECAY_CAP, ignores * IGNORE_DECAY_PER_IGNORE);
    return Math.max(0, score - penalty);
}

function computeConfidence(top: Candidate, runnerUp: Candidate | null, bundle: SignalBundle): number {
    const absStrength = clamp01(top.score);
    let separation = 0.0;
    if (runnerUp) {
        separation = clamp01((top.score - runnerUp.score) / 0.5);
    }
    const hardSignalBonus = hasHardSignal(top, bundle) ? 0.10 : 0.0;
    return clamp01((0.55 * absStrength) + (0.35 * separation) + hardSignalBonus);
}

function deriveReasons(f: Features, bundle: SignalBundle, c: Candidate): string[] {
    const reasons: string[] = [];
    if (f.urgency >= 0.7) reasons.push("Time-sensitive: approaching deadline.");
    if (f.blockedness >= 0.6) reasons.push("Unblocks other work.");
    if (f.user_intent >= 0.6) reasons.push("Matches recent intent.");
    if (f.recency >= 0.7) reasons.push("You were working on this recently.");
    if (f.leverage >= 0.7) reasons.push("High leverage item.");

    if (reasons.length === 0) reasons.push("Best next step.");
    return reasons;
}

function deriveAction(c: Candidate, f: Features, bundle: SignalBundle): RecommendedAction {
    switch (c.kind) {
        case 'blocker':
            return { label: "Unblock", action_type: "resolve", payload: { ref_id: c.ref_id, op: "resolve_blocker" } };
        case 'decision':
            return { label: "Make Decision", action_type: "decide", payload: { ref_id: c.ref_id, op: "open_decision" } };
        case 'action':
            const isNearDone = false; // heuristics TODO
            if (isNearDone) {
                return { label: "Complete", action_type: "resolve", payload: { ref_id: c.ref_id, op: "complete_action" } };
            } else {
                return { label: "Resume", action_type: "advance", payload: { ref_id: c.ref_id, op: "resume_action" } };
            }
        case 'session':
            return { label: "Resume Session", action_type: "advance", payload: { ref_id: c.ref_id, op: "resume_session" } };
        default:
            return { label: "Open", action_type: "advance", payload: { ref_id: c.ref_id, op: "open" } };
    }
}

function noClearNowResult(bundle: SignalBundle): NowResult {
    // Heuristic: Last session?
    return {
        status: "no_clear_now",
        explanation: "No single focus stands out. Set an intent or check your lists.",
        fallback_action: { label: "Set Intent", action_type: "advance", payload: { route: "/bridge", intent: "set_now" } }
    };
}

// --- Heuristics ---

function hasHardSignal(c: Candidate, bundle: SignalBundle) {
    // Simple stub
    return c.kind === 'blocker' || computeUrgency(c, bundle) > 0.9;
}

function computeUrgency(c: Candidate, bundle: SignalBundle): number {
    // Look up object in bundle by ref_id if needed, or rely on pre-computed fields.
    // For v1, basic mapping
    const item = findItem(c, bundle);
    // If item has priority 'critical' or 'high', urgency is higher
    if (item && item.priority) {
        if (item.priority === 'critical' || item.priority === 4) return 1.0;
        if (item.priority === 'high' || item.priority === 3) return 0.7;
    }
    return 0.2;
}

function computeBlockedness(c: Candidate, bundle: SignalBundle): number {
    // Stub
    return c.kind === 'blocker' ? 1.0 : 0.2;
}

function computeRecency(c: Candidate, bundle: SignalBundle): number {
    // Stub
    return 0.2;
}

function computeLeverage(c: Candidate, bundle: SignalBundle): number {
    if (c.kind === 'blocker') return 0.85;
    if (c.kind === 'decision') return 0.80;
    return 0.35;
}

function computeUserIntent(c: Candidate, bundle: SignalBundle): number {
    // Check user events
    return 0.25;
}

// --- Utils ---

function getTimestamp(t: Timestamp): number {
    if (typeof t === 'number') return t;
    return new Date(t).getTime();
}

function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function clampReasons(r: string[], min: number, max: number) {
    if (r.length < min) r.push("Selected based on current context.");
    return r.slice(0, max);
}

function findItem(c: Candidate, bundle: SignalBundle): any {
    if (c.kind === 'action') return bundle.actions.find(a => a.id === c.ref_id);
    // ... others
    return null;
}
