// lib/companion/contextBus.ts
"use client";

export type PulseContextFrame = {
    route?: string;
    title?: string;
    hints?: string[];
    focus?: any;
    actions?: Array<{ id: string; label: string }>;
};

const CHANNEL = "pulse_context_bus_v1";

export function publishPulseContext(frame: PulseContextFrame) {
    try {
        const bc = new BroadcastChannel(CHANNEL);
        bc.postMessage(frame);
        bc.close();
    } catch {
        // no-op (Safari/private contexts)
    }
}

export function subscribeToContextBus(cb: (frame: PulseContextFrame) => void) {
    let bc: BroadcastChannel | null = null;

    try {
        bc = new BroadcastChannel(CHANNEL);
        bc.onmessage = (ev) => cb(ev.data as PulseContextFrame);
    } catch {
        // no-op
    }

    return () => {
        try {
            bc?.close();
        } catch {
            // no-op
        }
    };
}

// Added alias to maintain compatibility if other files import this
export const subscribePulseContext = subscribeToContextBus;
export const publishContextFrame = publishPulseContext;

