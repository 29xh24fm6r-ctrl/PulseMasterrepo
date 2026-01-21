import type { PresenceMsg } from "./types";

const CHANNEL_NAME = "pulse_presence_v1";
const LS_KEY = "pulse_presence_v1_last_msg";

export function canUseBroadcastChannel() {
    return typeof window !== "undefined" && "BroadcastChannel" in window;
}

export function createPresenceChannel(onMessage: (msg: PresenceMsg) => void) {
    if (typeof window === "undefined") return { post: (_: PresenceMsg) => { }, close: () => { } };

    // Primary: BroadcastChannel
    if (canUseBroadcastChannel()) {
        const bc = new BroadcastChannel(CHANNEL_NAME);
        bc.onmessage = (ev) => {
            try {
                onMessage(ev.data as PresenceMsg);
            } catch {
                // ignore
            }
        };
        return {
            post: (msg: PresenceMsg) => bc.postMessage(msg),
            close: () => bc.close(),
        };
    }

    // Fallback: localStorage event
    const handler = (e: StorageEvent) => {
        if (e.key !== LS_KEY || !e.newValue) return;
        try {
            onMessage(JSON.parse(e.newValue) as PresenceMsg);
        } catch {
            // ignore
        }
    };
    window.addEventListener("storage", handler);

    return {
        post: (msg: PresenceMsg) => {
            try {
                localStorage.setItem(LS_KEY, JSON.stringify(msg));
            } catch {
                // ignore
            }
        },
        close: () => window.removeEventListener("storage", handler),
    };
}
