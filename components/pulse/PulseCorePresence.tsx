"use client";

import * as React from "react";

export type PulseCoreState = "calm" | "focus" | "alert" | "offline";

type Props = {
  state?: PulseCoreState;
  label?: string;
  size?: number; // px
  onActivate?: () => void; // optional click hook
};

/**
 * PulseCorePresence
 * - Client-only (no server imports)
 * - No deps (CSS keyframes only)
 * - A11y: aria-label + focus-visible ring
 * - Motion-safe: respects prefers-reduced-motion
 */
export default function PulseCorePresence({
  state = "calm",
  label = "Pulse Presence",
  size = 22,
  onActivate,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();

  const a11yState =
    state === "offline"
      ? "Offline"
      : state === "alert"
        ? "Alert"
        : state === "focus"
          ? "Focused"
          : "Calm";

  const disabled = state === "offline" && !onActivate;

  return (
    <button
      type="button"
      aria-label={`${label}: ${a11yState}`}
      onClick={onActivate}
      disabled={disabled}
      className={[
        "pulse-core",
        `pulse-core--${state}`,
        reducedMotion ? "pulse-core--reduced" : "",
      ].join(" ")}
      style={{ width: size, height: size }}
    >
      <span className="pulse-core__sr">Pulse state: {a11yState}</span>
      <span className="pulse-core__dot" aria-hidden="true" />
      <span className="pulse-core__ring" aria-hidden="true" />
      <span className="pulse-core__ring2" aria-hidden="true" />
    </button>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(!!mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  return reduced;
}

