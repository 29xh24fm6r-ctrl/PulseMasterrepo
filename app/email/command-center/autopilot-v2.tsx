"use client";

import * as React from "react";

type Rule = {
  id: string;
  enabled: boolean;
  kind: string | null;
  triage_label: string | null;
  min_confidence: number | null;
  max_per_day: number;
  intent: string;
};

export function AutopilotV2Card() {
  const [rules, setRules] = React.useState<Rule[]>([]);
  const [msg, setMsg] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  async function load() {
    setMsg(null);
    const resp = await fetch("/api/email/autopilot/rules/list", { cache: "no-store" });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data.ok) {
      setMsg(data?.error || `failed_${resp.status}`);
      setRules([]);
      return;
    }
    setRules(Array.isArray(data.rules) ? data.rules : []);
  }

  React.useEffect(() => {
    load();
  }, []);

  async function toggle(r: Rule, enabled: boolean) {
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/email/autopilot/rules/toggle", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: r.id, enabled }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        setMsg(data?.error || `failed_${resp.status}`);
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function createDefault() {
    setBusy(true);
    setMsg(null);
    try {
      const resp = await fetch("/api/email/autopilot/rules/create-default", { method: "POST" });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        setMsg(data?.error || `failed_${resp.status}`);
        return;
      }
      setMsg(data.already_exists ? "Default rule already exists." : "Default rule created.");
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-col">
          <div className="text-sm font-semibold">Autopilot v2 — Rules</div>
          <div className="text-xs opacity-70">Confidence-based auto-approval policy (safe by default).</div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={createDefault} disabled={busy} className="rounded-xl border px-3 py-2 text-sm hover:opacity-90 disabled:opacity-50">
            Create default safe rule
          </button>
          <button onClick={load} className="rounded-xl border px-3 py-2 text-sm hover:opacity-90">
            Refresh
          </button>
        </div>
      </div>

      {msg ? <div className="mt-2 text-xs opacity-80">{msg}</div> : null}

      {rules.length === 0 ? (
        <div className="mt-2 text-xs opacity-70">No rules yet.</div>
      ) : (
        <div className="mt-2 max-h-64 overflow-auto rounded-xl border p-2">
          <div className="flex flex-col gap-2">
            {rules.map((r) => (
              <div key={r.id} className="rounded-xl border p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold">
                    {r.enabled ? "✅" : "⛔"} {r.kind || "any"} | {r.triage_label || "any"} | conf ≥{" "}
                    {typeof r.min_confidence === "number" ? r.min_confidence.toFixed(2) : "—"}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] opacity-70">
                      cap {r.max_per_day}/day • intent {r.intent}
                    </div>
                    <button
                      onClick={() => toggle(r, !r.enabled)}
                      disabled={busy}
                      className="rounded-lg border px-2 py-1 text-[11px] hover:opacity-90 disabled:opacity-50"
                    >
                      {r.enabled ? "Disable" : "Enable"}
                    </button>
                  </div>
                </div>
                <div className="mt-1 text-[11px] opacity-60">Rule ID: {r.id}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-2 text-[11px] opacity-60">
        Auto-approval is globally gated by <code>EMAIL_AUTOPILOT_AUTOAPPROVE_ENABLED</code>. Keep it off until you verify rule behavior.
      </div>
    </div>
  );
}

