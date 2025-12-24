"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  NotebookPen,
  Headphones,
  Plus,
  Mic,
  X,
  CheckSquare,
  UserRound,
  Briefcase,
  BookOpen,
  Fingerprint,
  PhoneIncoming,
  Zap,
} from "lucide-react";
import { onPulseIncoming, type PulseIncomingEvent } from "@/lib/ui/pulseDockEvents";
import { resolveDockContext } from "@/lib/ui/pulseDockContext";
import { PulseRoutes } from "@/lib/ui/pulseRoutes";
import { safeGet, safeSet } from "@/lib/ui/storage";
import { haptic } from "@/lib/ui/haptics";

type CreateItem = {
  id: "task" | "contact" | "deal" | "journal" | "identity";
  label: string;
  description: string;
  icon: React.ReactNode;
  href: string;
};

function cx(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function IconButton({
  icon,
  label,
  onClick,
  intent = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  intent?: "neutral" | "primary" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cx(
        "w-12 h-12 rounded-2xl flex items-center justify-center",
        "border shadow-lg backdrop-blur-xl transition-all",
        intent === "primary"
          ? "bg-zinc-950/55 border-zinc-600 hover:border-zinc-500 hover:bg-zinc-950/70"
          : intent === "danger"
          ? "bg-red-950/30 border-red-700/50 hover:border-red-600"
          : "bg-zinc-950/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-950/55"
      )}
    >
      {icon}
    </button>
  );
}

function LabeledRow({
  icon,
  label,
  description,
  onClick,
  rightChip,
  hot,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  rightChip?: React.ReactNode;
  hot?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group w-full flex items-center gap-3 rounded-2xl px-3 py-2.5",
        "border bg-zinc-950/40 backdrop-blur-md transition-all",
        hot ? "border-amber-500/50 hover:border-amber-400" : "border-zinc-800 hover:border-zinc-700"
      )}
      aria-label={label}
      title={`${label} — ${description}`}
    >
      <div
        className={cx(
          "shrink-0 w-10 h-10 rounded-xl flex items-center justify-center",
          "border bg-zinc-900/60 transition-all",
          hot ? "border-amber-500/40" : "border-zinc-800 group-hover:border-zinc-700"
        )}
      >
        {icon}
      </div>

      <div className="min-w-0 text-left">
        <div className="text-sm font-semibold text-white leading-tight flex items-center gap-2">
          {label}
          {hot ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-200">
              NOW
            </span>
          ) : null}
        </div>
        <div className="text-[12px] text-zinc-400 leading-tight truncate">{description}</div>
      </div>

      <div className="ml-auto">{rightChip}</div>
    </button>
  );
}

function CreatePanel({
  open,
  onClose,
  items,
}: {
  open: boolean;
  onClose: () => void;
  items: CreateItem[];
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;

    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className={cx(
        "fixed z-50 w-[340px]",
        "rounded-3xl border border-zinc-700/60",
        "bg-zinc-950/75 backdrop-blur-xl shadow-2xl"
      )}
      style={{
        bottom: 96, // default; dock positioning will keep it safe
        right: 24,
      }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div>
          <div className="text-sm font-semibold text-white">Create</div>
          <div className="text-xs text-zinc-400">Add something to your system</div>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 flex items-center justify-center"
          aria-label="Close create panel"
        >
          <X className="w-4 h-4 text-zinc-200" />
        </button>
      </div>

      <div className="px-3 pb-4 space-y-2">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => (window.location.href = it.href)}
            className={cx(
              "w-full flex items-center gap-3 rounded-2xl px-3 py-3",
              "border border-zinc-800 bg-zinc-950/40",
              "hover:bg-zinc-900/40 hover:border-zinc-700 transition-all"
            )}
            aria-label={it.label}
            title={`${it.label} — ${it.description}`}
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-900/60 border border-zinc-800 flex items-center justify-center">
              {it.icon}
            </div>
            <div className="text-left">
              <div className="text-sm font-semibold text-white">{it.label}</div>
              <div className="text-[12px] text-zinc-400">{it.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Dock V2.1 "Polish"
 * - Persist user preference: expandedPreferred
 * - Auto-collapse on navigation
 * - Snap avoidance: shift left/up in narrow viewports
 * - Incoming pin: keep expanded for PIN_MS after incoming event
 * - Mobile haptics: small vibration on actions
 */
export function PulseControlDock() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Persisted preference
  const PREF_KEY = "pulse:dock:expandedPreferred";
  const [expandedPreferred, setExpandedPreferred] = useState<boolean>(() => safeGet(PREF_KEY, false));

  const [expanded, setExpanded] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const [incoming, setIncoming] = useState<PulseIncomingEvent | null>(null);
  const [incomingHotUntil, setIncomingHotUntil] = useState<number>(0);

  // Pin expanded state after incoming
  const PIN_MS = 8000;
  const pinnedUntilRef = useRef<number>(0);

  // Snap avoidance offsets
  const [dockOffset, setDockOffset] = useState<{ right: number; bottom: number }>({ right: 24, bottom: 24 });

  // Hide on auth pages
  const hidden = useMemo(() => {
    if (!pathname) return false;
    return pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  }, [pathname]);

  const createItems: CreateItem[] = useMemo(
    () => [
      {
        id: "task",
        label: "Task",
        description: "Add a next action",
        icon: <CheckSquare className="w-5 h-5 text-zinc-200" />,
        href: PulseRoutes.createTask,
      },
      {
        id: "contact",
        label: "Contact",
        description: "Add a person to your graph",
        icon: <UserRound className="w-5 h-5 text-zinc-200" />,
        href: PulseRoutes.createContact,
      },
      {
        id: "deal",
        label: "Deal",
        description: "Track an opportunity",
        icon: <Briefcase className="w-5 h-5 text-zinc-200" />,
        href: PulseRoutes.createDeal,
      },
      {
        id: "journal",
        label: "Journal",
        description: "Log thoughts and lessons",
        icon: <BookOpen className="w-5 h-5 text-zinc-200" />,
        href: PulseRoutes.createJournal,
      },
      {
        id: "identity",
        label: "Identity",
        description: "Update who you're becoming",
        icon: <Fingerprint className="w-5 h-5 text-zinc-200" />,
        href: PulseRoutes.identity,
      },
    ],
    []
  );

  const ctx = useMemo(() => {
    const inc = incoming ? { phone: incoming.phone, contactId: incoming.contactId, dealId: incoming.dealId } : undefined;
    return resolveDockContext(pathname || "/", inc);
  }, [pathname, incoming]);

  const isHot = Date.now() < incomingHotUntil;

  // --- Snap avoidance ---
  // Heuristic: if viewport is narrow or short, move dock left/up a bit so it doesn't cover cards.
  // This is deterministic (no DOM querying), safe, and "just works".
  useEffect(() => {
    function computeOffsets() {
      if (typeof window === "undefined") return;

      const w = window.innerWidth;
      const h = window.innerHeight;

      // Baseline
      let right = 24;
      let bottom = 24;

      // Narrow view: tuck inward (avoids covering scrollbar + bottom-right UI)
      if (w <= 1100) right = 18;
      if (w <= 900) right = 12;

      // Short view: lift the dock a bit so it doesn't sit on top of footer/cards
      if (h <= 760) bottom = 72;
      if (h <= 680) bottom = 92;

      // When expanded, give more breathing room from bottom
      if (expanded || createOpen) bottom = Math.max(bottom, 30);

      // extra lift on Home where bottom-right panels exist
      if ((pathname || "").startsWith("/home")) bottom = Math.max(bottom, 88);

      setDockOffset({ right, bottom });
    }

    computeOffsets();
    window.addEventListener("resize", computeOffsets);
    return () => window.removeEventListener("resize", computeOffsets);
  }, [expanded, createOpen, pathname]);

  // --- Hover expand/collapse (desktop) with "pin" protection ---
  const hoverRef = useRef<number | null>(null);

  function nowPinned(): boolean {
    return Date.now() < pinnedUntilRef.current;
  }

  function hoverExpand() {
    if (hoverRef.current) window.clearTimeout(hoverRef.current);
    hoverRef.current = window.setTimeout(() => setExpanded(true), 80);
  }

  function hoverCollapse() {
    if (hoverRef.current) window.clearTimeout(hoverRef.current);
    hoverRef.current = window.setTimeout(() => {
      if (createOpen) return;
      if (nowPinned()) return;
      if (!expandedPreferred) setExpanded(false);
    }, 180);
  }

  // --- Persist preference ---
  useEffect(() => {
    safeSet(PREF_KEY, expandedPreferred);
  }, [expandedPreferred]);

  // On mount: respect preference
  useEffect(() => {
    setExpanded(expandedPreferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Auto-collapse after navigation / route change ---
  // When pathname/search changes, collapse unless user prefers expanded
  const lastRouteRef = useRef<string>("");
  useEffect(() => {
    const routeKey = `${pathname || ""}?${searchParams?.toString() || ""}`;
    if (!lastRouteRef.current) {
      lastRouteRef.current = routeKey;
      return;
    }
    if (routeKey === lastRouteRef.current) return;

    lastRouteRef.current = routeKey;

    // Always close create panel on navigation (prevents "stuck overlay")
    setCreateOpen(false);

    // Collapse unless user prefers expanded or pinned by incoming
    if (!expandedPreferred && !nowPinned()) {
      setExpanded(false);
    }
  }, [pathname, searchParams, expandedPreferred]);

  // --- Incoming event listener ---
  useEffect(() => {
    return onPulseIncoming((evt) => {
      setIncoming(evt);
      setIncomingHotUntil(Date.now() + 12_000);

      // Pin expansion for a few seconds for "panic moments"
      pinnedUntilRef.current = Date.now() + PIN_MS;

      if (evt.revealDock !== false) setExpanded(true);

      // Optional auto-navigation
      const resolved = resolveDockContext(pathname || "/", { phone: evt.phone, contactId: evt.contactId, dealId: evt.dealId });
      if (evt.autoCapture) {
        window.location.href = resolved.captureHref;
      } else if (evt.autoEngage) {
        window.location.href = resolved.engageHref;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // If Create panel opens, force expanded
  useEffect(() => {
    if (createOpen) setExpanded(true);
  }, [createOpen]);

  if (hidden) return null;

  // Actions with haptics
  const goCapture = () => {
    haptic([8, 12, 8]);
    window.location.href = ctx.captureHref;
  };

  const goEngage = () => {
    haptic([12, 18, 12]);
    window.location.href = ctx.engageHref;
  };

  const goVoice = () => {
    haptic(10);
    window.location.href = "/realtime-voice";
  };

  const openCreate = () => {
    haptic(10);
    setCreateOpen(true);
    setExpanded(true);
  };

  const toggleExpandedPreferred = () => {
    haptic(10);
    setExpandedPreferred((v) => !v);
    // immediate UI response
    setExpanded((v) => !expandedPreferred ? true : v);
  };

  return (
    <>
      <CreatePanel open={createOpen} onClose={() => setCreateOpen(false)} items={createItems} />

      <div
        className="fixed z-50"
        style={{ right: dockOffset.right, bottom: dockOffset.bottom }}
        onMouseEnter={hoverExpand}
        onMouseLeave={hoverCollapse}
      >
        {expanded ? (
          <div
            className={cx(
              "w-[320px] rounded-[30px] p-3 space-y-2",
              "border shadow-2xl backdrop-blur-xl",
              isHot ? "border-amber-500/50 bg-zinc-950/65" : "border-zinc-700/60 bg-zinc-950/40"
            )}
          >
            {/* Top row */}
            <div className="flex items-center justify-between px-1 pb-1">
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                {isHot ? (
                  <>
                    <PhoneIncoming className="w-3.5 h-3.5 text-amber-300" />
                    <span className="text-amber-200">Incoming • act fast</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Pulse Controls</span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Pin/Preference toggle */}
                <button
                  onClick={toggleExpandedPreferred}
                  className={cx(
                    "px-2.5 py-1.5 rounded-xl border transition-all",
                    expandedPreferred
                      ? "border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200"
                      : "border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/40 text-zinc-200"
                  )}
                  aria-label={expandedPreferred ? "Dock pinned open" : "Dock not pinned"}
                  title={expandedPreferred ? "Pinned open" : "Pin dock open"}
                >
                  <span className="text-[12px] font-semibold">
                    {expandedPreferred ? "Pinned" : "Pin"}
                  </span>
                </button>

                {/* Voice */}
                <button
                  onClick={goVoice}
                  className={cx(
                    "flex items-center gap-2 px-2.5 py-1.5 rounded-xl",
                    "border transition-all",
                    isHot
                      ? "border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15"
                      : "border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/40"
                  )}
                  aria-label="Voice"
                  title="Voice — Talk to Pulse in realtime"
                >
                  <Mic className="w-4 h-4 text-zinc-200" />
                  <span className="text-[12px] font-semibold text-zinc-200">Voice</span>
                </button>
              </div>
            </div>

            <LabeledRow
              hot={isHot}
              icon={<NotebookPen className="w-5 h-5 text-white" />}
              label="Capture"
              description="Quick notes + recording now"
              onClick={goCapture}
              rightChip={
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900/40 text-zinc-300">
                  Notes
                </span>
              }
            />

            <LabeledRow
              hot={isHot}
              icon={<Headphones className="w-5 h-5 text-white" />}
              label={ctx.engageLabel}
              description={ctx.engageDescription}
              onClick={goEngage}
              rightChip={
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900/40 text-zinc-300">
                  Live
                </span>
              }
            />

            <LabeledRow
              icon={<Plus className="w-5 h-5 text-white" />}
              label="Create"
              description="Task • Contact • Deal • Journal • Identity"
              onClick={() => setCreateOpen((v) => !v)}
              rightChip={
                <span className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-900/40 text-zinc-300">
                  Add
                </span>
              }
            />

            <div className="pt-1 flex justify-end gap-2">
              <button
                onClick={() => {
                  haptic(8);
                  setCreateOpen(false);
                  // If user doesn't prefer expanded, collapse
                  if (!expandedPreferred && !nowPinned()) setExpanded(false);
                }}
                className="text-[11px] px-3 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/40 text-zinc-300"
                aria-label="Collapse"
              >
                Collapse
              </button>
            </div>
          </div>
        ) : (
          <div
            className={cx(
              "rounded-[26px] p-2 space-y-2",
              "border shadow-2xl backdrop-blur-xl",
              isHot ? "border-amber-500/60 bg-zinc-950/70" : "border-zinc-800 bg-zinc-950/35"
            )}
          >
            <IconButton
              intent={isHot ? "primary" : "neutral"}
              icon={<NotebookPen className="w-5 h-5 text-white" />}
              label="Capture"
              onClick={goCapture}
            />
            <IconButton
              intent={isHot ? "primary" : "neutral"}
              icon={<Headphones className="w-5 h-5 text-white" />}
              label={ctx.engageLabel}
              onClick={goEngage}
            />
            <IconButton
              intent="neutral"
              icon={<Plus className="w-5 h-5 text-white" />}
              label="Create"
              onClick={openCreate}
            />

            {/* Tap-to-expand affordance on compact mode */}
            <button
              onClick={() => {
                haptic(8);
                setExpanded(true);
              }}
              className="w-full mt-1 text-[11px] px-2 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950/30 hover:bg-zinc-900/40 text-zinc-300"
              aria-label="Expand"
            >
              Expand
            </button>
          </div>
        )}
      </div>
    </>
  );
}
