"use client";

import * as React from "react";
import PulseCard from "@/components/ui/PulseCard";

type Summary = {
  activeCount: number;
  overdue: number;
  needsAttention: number;
  top: Array<{
    id: string;
    name: string;
    last_contacted_at: string | null;
    follow_up_due_at: string | null;
    relationship_health: number | null;
    momentum: string | null;
  }>;
};

function daysAgo(iso: string | null) {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export default function RelationshipFieldCard() {
  const [loading, setLoading] = React.useState(true);
  const [summary, setSummary] = React.useState<Summary | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/relationships/summary", { cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (json?.ok && json?.summary) setSummary(json.summary);
      } catch {
        // silent fail (bulletproof UX)
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return (
    <PulseCard className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-white/60">Relationship Field</div>
          <div className="mt-1 text-lg font-semibold text-white">
            People who matter, kept alive.
          </div>
          <div className="mt-1 text-sm text-white/65">
            Pulse watches your human network and protects it from drift.
          </div>
        </div>

        {/* "Alive" micro-visual */}
        <div className="relative h-10 w-10">
          <div
            className="absolute inset-0 rounded-2xl border border-white/10 bg-white/[0.06]"
            style={{
              boxShadow:
                "0 0 22px rgba(168,85,247,0.22), 0 0 44px rgba(59,130,246,0.10)",
            }}
          />
          <div className="absolute inset-0 grid place-items-center">
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M5 13c2.6-5.2 11.4-5.2 14 0"
                fill="none"
                stroke="rgba(168,85,247,0.95)"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M7 15c2-3.4 8-3.4 10 0"
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <circle cx="12" cy="16.2" r="1.6" fill="rgba(59,130,246,0.85)" />
            </svg>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="Active" value={loading ? "—" : String(summary?.activeCount ?? 0)} />
        <Stat
          label="Needs attention"
          value={loading ? "—" : String(summary?.needsAttention ?? 0)}
          emphasize
        />
        <Stat label="Overdue" value={loading ? "—" : String(summary?.overdue ?? 0)} warn />
      </div>

      <div className="mt-4">
        <div className="text-xs text-white/60">Top attention targets</div>

        <div className="mt-2 space-y-2">
          {loading ? (
            <SkeletonRows />
          ) : (summary?.top?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/65">
              No contacts yet. Add your first person and Pulse will begin guarding the field.
            </div>
          ) : (
            summary!.top.map((p) => {
              const last = daysAgo(p.last_contacted_at);
              const due = p.follow_up_due_at ? new Date(p.follow_up_due_at).getTime() < Date.now() : false;

              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-white">{p.name}</div>
                    <div className="text-xs text-white/60">
                      {last === null ? "No touch recorded" : `Last touch: ${last}d ago`}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full border px-2 py-0.5 text-[11px]"
                      style={{
                        borderColor: due ? "rgba(239,68,68,0.35)" : "rgba(168,85,247,0.25)",
                        background: due ? "rgba(239,68,68,0.10)" : "rgba(168,85,247,0.10)",
                        color: "rgba(255,255,255,0.78)",
                      }}
                    >
                      {due ? "Due" : "Watch"}
                    </span>
                    <a
                      href={`/people/${p.id}`}
                      className="text-xs text-white/70 hover:text-white"
                    >
                      Open →
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <a
          href="/relationships"
          className="text-sm text-white/70 hover:text-white"
        >
          View People →
        </a>
        <a
          href="/people/create"
          className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs text-white/80 hover:bg-white/[0.08]"
        >
          Add person
        </a>
      </div>
    </PulseCard>
  );
}

function Stat({
  label,
  value,
  emphasize,
  warn,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  warn?: boolean;
}) {
  const bg = warn ? "rgba(239,68,68,0.10)" : emphasize ? "rgba(168,85,247,0.12)" : "rgba(255,255,255,0.04)";
  const border = warn ? "rgba(239,68,68,0.22)" : emphasize ? "rgba(168,85,247,0.22)" : "rgba(255,255,255,0.10)";
  return (
    <div
      className="rounded-xl border p-3"
      style={{ background: bg, borderColor: border }}
    >
      <div className="text-xs text-white/60">{label}</div>
      <div className="mt-1 text-xl font-semibold text-white">{value}</div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-[46px] rounded-xl border border-white/10 bg-white/[0.04]"
        />
      ))}
    </div>
  );
}

