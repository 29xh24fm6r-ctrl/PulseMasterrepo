import type { EventSink } from "./eventSink.js";
import type { EmitEvent } from "../convo/types.js";

export class HttpEventSink implements EventSink {
    private readonly endpoint?: string;
    private readonly token?: string;

    constructor(opts: { endpoint?: string; token?: string }) {
        this.endpoint = opts.endpoint;
        this.token = opts.token;
    }

    async emit(evt: EmitEvent): Promise<void> {
        if (!this.endpoint) return; // gateway-only: safe no-op if not configured

        const res = await fetch(this.endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
            },
            body: JSON.stringify(evt),
        });

        if (!res.ok) {
            const body = await res.text().catch(() => "");
            // Do not throw hard; event sink must not break the call flow.
            // But we still surface in logs.
            // eslint-disable-next-line no-console
            console.error("EventSink emit failed", res.status, res.statusText, body);
        }
    }
}
