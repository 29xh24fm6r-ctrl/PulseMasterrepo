export type PulseIncomingEvent = {
  source: "twilio" | "teams" | "phone" | "unknown";
  phone?: string;
  contactId?: string;
  dealId?: string;
  displayName?: string;
  // If true, open the dock immediately
  revealDock?: boolean;
  // If true, immediately start capture (notes mode) on navigation
  autoCapture?: boolean;
  // If true, immediately start engage (hybrid mode) on navigation
  autoEngage?: boolean;
};

const EVENT_NAME = "pulse:incoming";

export function emitPulseIncoming(event: PulseIncomingEvent) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: event }));
}

export function onPulseIncoming(handler: (event: PulseIncomingEvent) => void) {
  if (typeof window === "undefined") return () => {};
  const listener = (e: Event) => {
    const ce = e as CustomEvent<PulseIncomingEvent>;
    if (ce?.detail) handler(ce.detail);
  };
  window.addEventListener(EVENT_NAME, listener);
  return () => window.removeEventListener(EVENT_NAME, listener);
}

