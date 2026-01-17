export type PulseContextFrame = {
    ts: number;
    route: string;
    title?: string;
    entities?: Array<{ type: string; id: string; label?: string }>;
    focus?: { type: string; id: string; label?: string };
    hints?: string[];
};

const CHANNEL = "pulse_context_bus_v1";

let bc: BroadcastChannel | null = null;

function getBC(): BroadcastChannel | null {
    if (typeof window === "undefined") return null;
    if (bc) return bc;
    bc = new BroadcastChannel(CHANNEL);
    return bc;
}

type Listener = (frame: PulseContextFrame) => void;
const listeners = new Set<Listener>();

export function publishPulseContext(partial: Omit<PulseContextFrame, "ts">) {
    const frame: PulseContextFrame = { ts: Date.now(), ...partial };
    // local listeners
    for (const l of listeners) l(frame);
    // cross-window
    const ch = getBC();
    ch?.postMessage(frame);
}

export function subscribePulseContext(listener: Listener) {
    listeners.add(listener);
    const ch = getBC();
    if (ch) {
        const handler = (ev: MessageEvent) => listener(ev.data as PulseContextFrame);
        ch.addEventListener("message", handler);
        return () => {
            listeners.delete(listener);
            ch.removeEventListener("message", handler);
        };
    }
    return () => listeners.delete(listener);
}
