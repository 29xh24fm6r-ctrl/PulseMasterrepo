import * as mock from './mock';
import {
    LifeState,
    TrendPoint,
    NotableEvent,
    PlanSection,
    PlanItem,
    ObserverData,
    Message,
} from './types';

const USE_MOCK = process.env.NEXT_PUBLIC_RUNTIME_MODE === 'mock';

type RuntimeResult<T> =
    | { ok: true; data: T }
    | { ok: false; error: RuntimeApiError };

export interface RuntimeApiError {
    code: string;
    message: string;
    status: number;
}

// Helper to standardise Fetch vs Mock
export async function runtimeFetchJSON<T>(endpoint: string): Promise<RuntimeResult<T>> {
    try {
        const res = await fetch(`/api/runtime/${endpoint}`, {
            headers: {},
            credentials: 'include' // ✅ Antigravity: Enforce credentials for all runtime calls
        });

        if (!res.ok) {
            let errorBody;
            try { errorBody = await res.json(); } catch (e) { errorBody = { code: 'UNKNOWN', error: res.statusText }; }

            return {
                ok: false,
                error: {
                    status: res.status,
                    code: errorBody.code || 'SERVER_ERROR',
                    message: errorBody.error || 'Request failed'
                }
            };
        }

        const data = await res.json();
        return { ok: true, data };

    } catch (e: any) {
        return {
            ok: false,
            error: { status: 0, code: 'NETWORK_ERROR', message: e.message }
        };
    }
}

// --- GETTERS ---

export async function getLifeState(): Promise<LifeState> {
    if (USE_MOCK) return mock.getLifeState();

    const res = await runtimeFetchJSON<{ lifeState: LifeState, orientationLine: string }>('home');
    if (!res.ok) throw res.error;
    return res.data.lifeState;
}

export async function getTrends(): Promise<Record<string, TrendPoint[]>> {
    if (USE_MOCK) return mock.getTrends();
    const res = await runtimeFetchJSON<{ trends: Record<string, TrendPoint[]> }>('state');
    if (!res.ok) throw res.error;
    return res.data.trends;
}

export async function getNotables(): Promise<NotableEvent[]> {
    if (USE_MOCK) return mock.getNotables();
    const res = await runtimeFetchJSON<{ notables: NotableEvent[] }>('state');
    if (!res.ok) throw res.error;
    return res.data.notables;
}

export async function getPlanLedger(): Promise<PlanSection[]> {
    if (USE_MOCK) return mock.getPlanLedger();
    const res = await runtimeFetchJSON<{ today: PlanItem[], pending: PlanItem[], recent: PlanItem[] }>('plan');
    if (!res.ok) throw res.error;

    // Convert flat lists to Sections
    const { today, pending, recent } = res.data;
    return [
        { id: 'today', title: 'Today', items: today },
        { id: 'pending', title: 'Pending', items: pending },
        { id: 'recent', title: 'Recent', items: recent }
    ];
}

export async function getObserverData(): Promise<ObserverData> {
    if (USE_MOCK) return mock.getObserverData();
    const res = await runtimeFetchJSON<ObserverData>('observer');
    if (!res.ok) throw res.error;
    return res.data;
}

export async function sendBridgeMessage(text: string): Promise<Message> {
    if (USE_MOCK) {
        // Mock logic: return a fake message after delay
        const replyText = await mock.sendBridgeMessageMock(text);
        return {
            id: 'mock-reply-' + Date.now(),
            role: 'pulse',
            content: replyText,
            timestamp: new Date(),
            hasExplanation: true
        };
    }

    // Real API
    try {
        const r = await fetch('/api/runtime/bridge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
        });
        if (!r.ok) {
            const body = await r.json();
            throw { status: r.status, code: body.code || 'SERVER_ERROR', message: body.error };
        }
        const data = await r.json();
        return data.reply;
    } catch (e: any) {
        if (e.code) throw e;
        throw { status: 0, code: 'NETWORK_ERROR', message: 'Failed to send message' };
    }
}

// Keep export for mock fallback usage if needed directly? 
// Provider doesn't use it directly anymore, so maybe not needed.
// But I'll keep it to matching existing imports if any.
export const sendBridgeMessageMock = mock.sendBridgeMessageMock;
