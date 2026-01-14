import type { EventSink } from "./eventSink.js";
import type { EmitEvent } from "../convo/types.js";

export class NoopEventSink implements EventSink {
    async emit(_evt: EmitEvent): Promise<void> {
        // intentionally noop
    }
}
