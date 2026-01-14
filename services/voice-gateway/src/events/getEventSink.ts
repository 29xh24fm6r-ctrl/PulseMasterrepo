import { HttpEventSink } from "./httpEventSink.js";
import { NoopEventSink } from "./noopEventSink.js";
import type { EventSink } from "./eventSink.js";

export function getEventSink(): EventSink {
    const endpoint = process.env.PULSE_EVENTS_ENDPOINT;
    const token = process.env.PULSE_EVENTS_TOKEN;

    if (endpoint && endpoint.trim().length > 0) {
        return new HttpEventSink({ endpoint, token });
    }
    return new NoopEventSink();
}
