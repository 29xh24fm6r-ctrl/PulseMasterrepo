import { createPresenceChannel } from "./channel";
import type { PresenceError, PresenceEvent, PresenceState } from "./types";

let chan: ReturnType<typeof createPresenceChannel> | null = null;

function ensureChan() {
    if (typeof window === "undefined") return null;
    if (chan) return chan;

    chan = createPresenceChannel((_msg) => {
        // main window doesn't need to process incoming in v1
    });

    return chan;
}

export function presencePing() {
    const c = ensureChan();
    c?.post({ type: "presence:ping", from: "main", ts: Date.now() });
}

export function presenceSendState(payload: PresenceState) {
    const c = ensureChan();
    c?.post({ type: "presence:state", from: "main", ts: Date.now(), payload });
}

export function presenceSendEvent(payload: PresenceEvent) {
    const c = ensureChan();
    c?.post({ type: "presence:event", from: "main", ts: Date.now(), payload });
}

export function presenceSendError(payload: PresenceError) {
    const c = ensureChan();
    c?.post({ type: "presence:error", from: "main", ts: Date.now(), payload });
}
