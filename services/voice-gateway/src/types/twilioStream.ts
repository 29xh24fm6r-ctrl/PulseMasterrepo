export type TwilioStreamEvent =
    | { event: "connected"; protocol?: string; version?: string }
    | { event: "start"; start: { streamSid: string; callSid: string; tracks?: string[] } }
    | { event: "media"; media: { payload: string; track?: string; timestamp?: string } }
    | { event: "mark"; mark: { name: string } }
    | { event: "stop"; stop: { streamSid: string } };

export function isTwilioStreamEvent(x: any): x is TwilioStreamEvent {
    return x && typeof x.event === "string";
}
