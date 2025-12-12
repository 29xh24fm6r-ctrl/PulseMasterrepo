"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mic, MicOff, Square, Brain, ChevronLeft, ChevronRight } from "lucide-react";

type PulseLiveMode = "dormant" | "listening" | "advising" | "critical" | "finalizing";

type PulseLiveStatus = {
  session_id: string;
  is_recording: boolean;
  coach_enabled: boolean;
  criticality: number; // 0..1
  current_speaker?: { speaker_key: string; label?: string; contact_id?: string };
  segments: Array<{ id: string; at: string; speaker?: string; text: string; tags?: string[] }>;
  artifacts: {
    actions: Array<{ id: string; text: string; owner?: string; due?: string }>;
    decisions: Array<{ id: string; text: string }>;
    risks: Array<{ id: string; text: string }>;
  };
  coach_nudge?: { id: string; text: string; intent?: string; confidence?: number } | null;
  context: {
    people?: Array<{ id: string; name: string }>;
    deal?: { id: string; name: string } | null;
    memory?: { id: string; hint: string } | null;
    intel?: { id: string; hint: string } | null;
  };
  filing?: { state: "idle" | "working" | "done"; message?: string } | null;
};

function computeMode(s: PulseLiveStatus | null): PulseLiveMode {
  if (!s) return "dormant";
  if (s.filing?.state === "working") return "finalizing";
  if (s.coach_nudge && s.criticality >= 0.92) return "critical";
  if (s.coach_nudge) return "advising";
  if (s.is_recording) return "listening";
  return "dormant";
}

export function PulseLiveDock(props: {
  sessionId: string | null;
  defaultCollapsed?: boolean;
  onStop?: () => Promise<void> | void;
}) {
  const [collapsed, setCollapsed] = useState(!!props.defaultCollapsed);
  const [status, setStatus] = useState<PulseLiveStatus | null>(null);
  const mode = useMemo(() => computeMode(status), [status]);

  const pollRef = useRef<number | null>(null);

  // Poll live status (swap to SSE/WS later)
  useEffect(() => {
    if (!props.sessionId) return;

    const poll = async () => {
      try {
        const res = await fetch(`/api/pulse-live/status?session_id=${encodeURIComponent(props.sessionId!)}`);
        const json = (await res.json()) as PulseLiveStatus;
        setStatus(json);
      } catch {
        // keep last known state
      }
    };

    poll();
    pollRef.current = window.setInterval(poll, 1200);
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = null;
    };
  }, [props.sessionId]);

  const headerSubtitle =
    mode === "critical" ? "Advising (high leverage)" :
    mode === "advising" ? "Advising" :
    mode === "finalizing" ? "Finalizing" :
    mode === "listening" ? "Listening" :
    "Ready";

  const chromeGlow =
    mode === "critical" ? "ring-1 ring-amber-500/40 shadow-[0_0_40px_rgba(245,158,11,0.12)]" :
    mode === "advising" ? "ring-1 ring-violet-500/30 shadow-[0_0_40px_rgba(139,92,246,0.10)]" :
    "ring-0";

  return (
    <div className="relative">
      <AnimatePresence initial={false}>
        {/* Collapsed spine */}
        {collapsed ? (
          <motion.button
            key="collapsed"
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 20, opacity: 0 }}
            onClick={() => setCollapsed(false)}
            className="fixed right-3 top-24 z-[80] flex h-48 w-10 items-center justify-center rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl text-zinc-200 hover:bg-zinc-900"
            aria-label="Open Pulse Live"
          >
            <ChevronLeft className="h-4 w-4" />
          </motion.button>
        ) : (
          <motion.aside
            key="dock"
            initial={{ x: 24, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 24, opacity: 0 }}
            className={`fixed right-3 top-16 z-[80] h-[calc(100vh-88px)] w-[390px] rounded-3xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-xl ${chromeGlow}`}
          >
            <PulseLiveHeader
              title="Pulse Live"
              subtitle={headerSubtitle}
              isRecording={!!status?.is_recording}
              coachEnabled={!!status?.coach_enabled}
              onToggleCoach={async () => {
                // optional: POST /api/pulse-live/settings
                setStatus((s) => (s ? { ...s, coach_enabled: !s.coach_enabled } : s));
              }}
              onStop={props.onStop}
              onCollapse={() => setCollapsed(true)}
              mode={mode}
            />

            <div className="px-4 pb-4">
              <CurrentSpeakerLine speaker={status?.current_speaker} />

              <div className="mt-3 grid grid-cols-1 gap-3">
                <LiveNotesStream segments={status?.segments || []} />

                <ArtifactTabs
                  actions={status?.artifacts?.actions || []}
                  decisions={status?.artifacts?.decisions || []}
                  risks={status?.artifacts?.risks || []}
                />

                <CoachLens
                  mode={mode}
                  nudge={status?.coach_nudge || null}
                  coachEnabled={!!status?.coach_enabled}
                  onApply={() => {/* hook to insert suggested line into a "say next" field */}}
                  onDismiss={() => setStatus((s) => (s ? { ...s, coach_nudge: null } : s))}
                  onExpand={() => {/* open expand modal */}}
                />

                <ContextStrip context={status?.context} />

                <FilingToast filing={status?.filing || null} />
              </div>
            </div>

            <div className="absolute bottom-3 left-0 right-0 px-4">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
                <div className="text-[11px] text-zinc-500">
                  Calm by default. Flash only when leverage spikes.
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function PulseLiveHeader(props: {
  title: string;
  subtitle: string;
  isRecording: boolean;
  coachEnabled: boolean;
  onToggleCoach: () => void;
  onStop?: () => Promise<void> | void;
  onCollapse: () => void;
  mode: PulseLiveMode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-4">
      <div className="flex items-center gap-3">
        <PulseOrb mode={props.mode} />
        <div>
          <div className="text-sm font-semibold text-white">{props.title}</div>
          <div className="text-xs text-zinc-500">{props.subtitle}</div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={props.onToggleCoach}
          className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs transition-colors ${
            props.coachEnabled
              ? "border-violet-500/40 bg-violet-500/10 text-violet-200"
              : "border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-900/40"
          }`}
          title="Coach nudges"
        >
          <Brain className="h-4 w-4" />
          Coach
        </button>

        <button
          onClick={props.onStop}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900/40"
          title="Stop"
        >
          <Square className="h-4 w-4" />
          Stop
        </button>

        <button
          onClick={props.onCollapse}
          className="inline-flex items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950/40 p-2 text-zinc-200 hover:bg-zinc-900/40"
          title="Collapse"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function PulseOrb(props: { mode: PulseLiveMode }) {
  const glow =
    props.mode === "critical" ? "from-amber-500/40 to-rose-500/20" :
    props.mode === "advising" ? "from-violet-500/35 to-pink-500/20" :
    props.mode === "listening" ? "from-violet-500/25 to-indigo-500/15" :
    "from-zinc-700/30 to-zinc-700/10";

  return (
    <div className={`relative h-10 w-10 rounded-2xl bg-gradient-to-br ${glow} border border-zinc-800`}>
      <motion.div
        className="absolute inset-0 rounded-2xl"
        animate={{ opacity: [0.35, 0.6, 0.35] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ background: "radial-gradient(circle at 30% 30%, rgba(255,255,255,0.08), transparent 55%)" }}
      />
    </div>
  );
}

function CurrentSpeakerLine(props: { speaker?: PulseLiveStatus["current_speaker"] }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-950/40 px-3 py-2">
      <div className="text-xs text-zinc-500">Speaking</div>
      <div className="text-xs text-zinc-200">
        {props.speaker?.label || props.speaker?.speaker_key || "—"}
      </div>
    </div>
  );
}

function LiveNotesStream(props: { segments: PulseLiveStatus["segments"] }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Live Notes</div>
        <div className="text-[11px] text-zinc-500">Rolling transcript, grouped by turns</div>
      </div>

      <div className="mt-3 max-h-[240px] space-y-2 overflow-auto pr-1">
        {props.segments.length === 0 ? (
          <div className="text-sm text-zinc-400">Waiting for audio/transcript…</div>
        ) : (
          props.segments.slice(-20).map((s) => (
            <div key={s.id} className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-zinc-500">{s.at}</div>
                <div className="text-xs text-zinc-300">{s.speaker || "Unknown"}</div>
              </div>
              <div className="mt-2 text-sm text-zinc-100">{s.text}</div>
              {s.tags?.length ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {s.tags.map((t) => (
                    <span key={t} className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-2 py-0.5 text-[11px] text-zinc-300">
                      {t}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ArtifactTabs(props: {
  actions: PulseLiveStatus["artifacts"]["actions"];
  decisions: PulseLiveStatus["artifacts"]["decisions"];
  risks: PulseLiveStatus["artifacts"]["risks"];
}) {
  const [tab, setTab] = useState<"actions" | "decisions" | "risks">("actions");

  const count = {
    actions: props.actions.length,
    decisions: props.decisions.length,
    risks: props.risks.length,
  };

  const items =
    tab === "actions" ? props.actions :
    tab === "decisions" ? props.decisions :
    props.risks;

  const TabBtn = ({ k, label }: { k: typeof tab; label: string }) => (
    <button
      onClick={() => setTab(k)}
      className={`rounded-xl px-3 py-2 text-xs transition-colors ${
        tab === k ? "bg-violet-600/20 text-violet-200" : "text-zinc-300 hover:bg-zinc-900/40"
      }`}
    >
      {label} <span className="ml-1 text-[11px] text-zinc-500">({count[k]})</span>
    </button>
  );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Artifacts</div>
        <div className="text-[11px] text-zinc-500">Auto-captured</div>
      </div>

      <div className="mt-3 flex gap-2">
        <TabBtn k="actions" label="Actions" />
        <TabBtn k="decisions" label="Decisions" />
        <TabBtn k="risks" label="Risks" />
      </div>

      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <div className="text-sm text-zinc-400">Nothing captured yet.</div>
        ) : (
          items.slice(-6).map((it: any) => (
            <div key={it.id} className="rounded-xl border border-zinc-800 bg-zinc-950/30 p-3">
              <div className="text-sm text-zinc-100">{it.text}</div>
              {"owner" in it && it.owner ? (
                <div className="mt-1 text-[11px] text-zinc-500">
                  Owner: <span className="text-zinc-300">{it.owner}</span>
                  {it.due ? <> • Due: <span className="text-zinc-300">{it.due}</span></> : null}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CoachLens(props: {
  mode: PulseLiveMode;
  coachEnabled: boolean;
  nudge: PulseLiveStatus["coach_nudge"];
  onApply: () => void;
  onDismiss: () => void;
  onExpand: () => void;
}) {
  if (!props.coachEnabled) return null;
  if (!props.nudge) return null;

  const isCritical = props.mode === "critical";
  return (
    <motion.div
      initial={{ y: 12, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className={`rounded-2xl border p-3 ${
        isCritical
          ? "border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-rose-500/5"
          : "border-violet-500/35 bg-gradient-to-br from-violet-500/10 to-pink-500/5"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Coach Lens</div>
        <div className="text-[11px] text-zinc-500">{isCritical ? "High leverage" : "Suggestion"}</div>
      </div>

      <div className="mt-2 text-sm text-zinc-100">{props.nudge.text}</div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={props.onApply}
          className="flex-1 rounded-xl bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/15"
        >
          Apply
        </button>
        <button
          onClick={props.onDismiss}
          className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900/40"
        >
          Dismiss
        </button>
        <button
          onClick={props.onExpand}
          className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900/40"
        >
          Expand
        </button>
      </div>
    </motion.div>
  );
}

function ContextStrip(props: { context?: PulseLiveStatus["context"] }) {
  const c = props.context;
  if (!c) return null;

  const Chip = ({ label, hint }: { label: string; hint?: string | null }) => (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/30 px-3 py-2">
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="text-xs text-zinc-200 line-clamp-1">{hint || "—"}</div>
    </div>
  );

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-white">Context</div>
        <div className="text-[11px] text-zinc-500">Pulse awareness</div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <Chip label="People" hint={c.people?.map((p) => p.name).slice(0, 2).join(", ") || null} />
        <Chip label="Deal" hint={c.deal?.name || null} />
        <Chip label="Memory" hint={c.memory?.hint || null} />
        <Chip label="Intel" hint={c.intel?.hint || null} />
      </div>
    </div>
  );
}

function FilingToast(props: { filing: PulseLiveStatus["filing"] | null }) {
  if (!props.filing || props.filing.state === "idle") return null;
  const done = props.filing.state === "done";

  return (
    <div className={`rounded-2xl border p-3 ${done ? "border-emerald-500/35 bg-emerald-500/10" : "border-zinc-800 bg-zinc-950/40"}`}>
      <div className="text-sm font-semibold text-white">{done ? "Filed" : "Finalizing"}</div>
      <div className="mt-1 text-xs text-zinc-300">{props.filing.message || (done ? "Captured. Logged. Linked." : "Writing notes, actions, and memory…")}</div>
    </div>
  );
}
