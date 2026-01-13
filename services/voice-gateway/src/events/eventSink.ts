import type { EmitEvent } from "../convo/types.js";

export interface EventSink {
    emit(evt: EmitEvent): Promise<void>;
}
