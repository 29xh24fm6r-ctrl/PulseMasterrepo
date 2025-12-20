"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import PulseCorePresence from "@/components/pulse/PulseCorePresence";
import { PULSE_FEATURES, PulseFeature } from "@/lib/pulse/features";
import { getContextActions } from "@/lib/pulse/contextActions";

type PaletteItem = PulseFeature;

export default function PulseCommandBar() {
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const [pulseState, setPulseState] = React.useState<"calm" | "focus" | "alert">("calm");

  // Keyboard shortcut: Cmd/Ctrl+K
  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key.toLowerCase() === "k";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Lightweight "alive" state: focus if user toggles (later), alert if user idle? keep simple now.
  // Bulletproof: deterministic default.
  React.useEffect(() => {
    // Optional future: fetch("/api/pulse/presence") to drive this.
    setPulseState("calm");
  }, []);

  const groups = groupFeatures(PULSE_FEATURES);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return PULSE_FEATURES;

    return PULSE_FEATURES.filter((f) => {
      const hay = [
        f.label,
        f.group,
        f.href,
        ...(f.keywords || []),
        ...(f.description ? [f.description] : []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [q]);

  const activeKey = React.useMemo(() => {
    const match = PULSE_FEATURES.find((f) => pathname?.startsWith(f.href));
    return match?.key ?? "home";
  }, [pathname]);

  const ctxActions = React.useMemo(() => getContextActions(pathname || "/"), [pathname]);

  return (
    <>
      <div className="pulse-cmdbar">
        <div className="pulse-cmdbar__inner">
          {/* Left: brand + presence */}
          <div className="pulse-cmdbar__left">
            <a href="/home" className="pulse-cmdbar__brand" aria-label="Pulse Home">
              <span className="pulse-cmdbar__logo">Pulse</span>
            </a>

            <div className="pulse-cmdbar__presence">
              <PulseCorePresence state={pulseState} size={22} label="Pulse Presence" />
              <span className="pulse-cmdbar__presenceText">
                {pulseState === "alert" ? "Attention required" : pulseState === "focus" ? "Focus mode" : "Pulse online"}
              </span>
            </div>
          </div>

          {/* Center: primary feature nav (iconless for now, crisp) */}
          <nav className="pulse-cmdbar__nav" aria-label="Primary">
            {Object.entries(groups).map(([group, items]) => (
              <div className="pulse-cmdbar__navGroup" key={group}>
                <div className="pulse-cmdbar__navGroupLabel">{group}</div>
                <div className="pulse-cmdbar__navGroupItems">
                  {items.slice(0, 2).map((f) => (
                    <a
                      key={f.key}
                      href={f.href}
                      className={[
                        "pulse-cmdbar__chip",
                        f.key === activeKey ? "is-active" : "",
                      ].join(" ")}
                      title={f.description || f.label}
                    >
                      {f.label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* Right: context actions + command search */}
          <div className="pulse-cmdbar__right">
            <div className="pulse-cmdbar__actions" aria-label="Context actions">
              {ctxActions.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  className={[
                    "pulse-cmdbar__actionBtn",
                    a.intent === "primary" ? "is-primary" : "",
                  ].join(" ")}
                  onClick={() => {
                    if (a.href) router.push(a.href);
                  }}
                  title={a.label}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className="pulse-cmdbar__search"
              onClick={() => setOpen(true)}
              aria-label="Open Command Search"
            >
              <span className="pulse-cmdbar__searchHint">Command or search…</span>
              <span className="pulse-cmdbar__kbd">Ctrl K</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spacer so content doesn't sit under fixed bar */}
      <div className="pulse-cmdbar__spacer" aria-hidden="true" />

      {/* Command Palette */}
      {open ? (
        <CommandPalette
          q={q}
          setQ={setQ}
          items={filtered}
          onClose={() => {
            setOpen(false);
            setQ("");
          }}
          onPick={(item) => {
            setOpen(false);
            setQ("");
            router.push(item.href);
          }}
        />
      ) : null}
    </>
  );
}

function groupFeatures(features: PulseFeature[]) {
  const out: Record<string, PulseFeature[]> = {};
  for (const f of features) {
    if (!out[f.group]) out[f.group] = [];
    out[f.group].push(f);
  }
  return out;
}

function CommandPalette({
  q,
  setQ,
  items,
  onClose,
  onPick,
}: {
  q: string;
  setQ: (v: string) => void;
  items: PaletteItem[];
  onClose: () => void;
  onPick: (item: PaletteItem) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const [idx, setIdx] = React.useState(0);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setIdx((v) => Math.min(v + 1, items.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setIdx((v) => Math.max(v - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const item = items[idx];
        if (item) onPick(item);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items, idx, onClose, onPick]);

  return (
    <div className="pulse-palette" role="dialog" aria-modal="true" aria-label="Command Search">
      <div className="pulse-palette__backdrop" onClick={onClose} />
      <div className="pulse-palette__panel">
        <div className="pulse-palette__header">
          <div className="pulse-palette__title">Command Search</div>
          <button className="pulse-palette__close" onClick={onClose} aria-label="Close">
            Esc
          </button>
        </div>

        <input
          ref={inputRef}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setIdx(0);
          }}
          className="pulse-palette__input"
          placeholder="Type to jump… (People, Tasks, Deals, Brain…)"
        />

        <div className="pulse-palette__list" role="listbox">
          {items.slice(0, 12).map((item, i) => (
            <button
              key={item.key}
              className={[
                "pulse-palette__item",
                i === idx ? "is-active" : "",
              ].join(" ")}
              onMouseEnter={() => setIdx(i)}
              onClick={() => onPick(item)}
              role="option"
              aria-selected={i === idx}
            >
              <div className="pulse-palette__itemMain">{item.label}</div>
              <div className="pulse-palette__itemMeta">{item.group}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

