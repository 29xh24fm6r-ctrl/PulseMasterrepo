// ============================================================================
// PULSE A.C.D. — Client-side Telemetry Helper
// ============================================================================

import { TelemetryEventType } from "@/types/dashboard";

export async function logDashboardEvent(event: {
  widgetKey: string;
  eventType: TelemetryEventType;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  void fetch("/api/dashboard/telemetry", {
    method: "POST",
    body: JSON.stringify(event),
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
}

export function createWidgetTracker(widgetKey: string) {
  let openTime: number | null = null;

  return {
    open: () => {
      openTime = Date.now();
      logDashboardEvent({ widgetKey, eventType: "OPEN" });
    },
    close: () => {
      const duration = openTime ? Date.now() - openTime : 0;
      logDashboardEvent({ widgetKey, eventType: "CLOSE", metadata: { duration_ms: duration } });
      openTime = null;
    },
    click: (target?: string) => {
      logDashboardEvent({ widgetKey, eventType: "CLICK", metadata: target ? { target } : undefined });
    },
    dismiss: () => {
      logDashboardEvent({ widgetKey, eventType: "DISMISS" });
    },
  };
}

export function logFocusModeToggle(enabled: boolean): void {
  logDashboardEvent({ widgetKey: "focus_mode", eventType: "FOCUS_MODE_TOGGLE", metadata: { enabled } });
}
