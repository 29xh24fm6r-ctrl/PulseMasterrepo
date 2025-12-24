"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Mic, NotebookPen, Headphones } from "lucide-react";
import QuickActionsFAB from "@/app/components/quick-actions-fab";

function DockButton({
  icon,
  label,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
}) {
  return (
    <button
      onClick={() => (window.location.href = href)}
      className="group w-12 h-12 rounded-full bg-zinc-900/90 border border-zinc-700 shadow-lg hover:bg-zinc-800 transition-all flex items-center justify-center relative"
      aria-label={label}
      title={label}
    >
      {icon}
      <div className="pointer-events-none absolute right-14 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="px-3 py-1.5 rounded-lg bg-black/80 border border-zinc-700 text-xs text-zinc-200 whitespace-nowrap">
          {label}
        </div>
      </div>
    </button>
  );
}

export function PulseActionDock() {
  const pathname = usePathname();

  // hide dock on auth pages
  if (
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up")
  ) {
    return null;
  }

  return (
    <>
      {/* Your existing plus/create FAB */}
      <QuickActionsFAB />

      {/* Notes + Live Session + Voice (stacked above the +) */}
      <div className="fixed bottom-6 right-24 z-50 flex flex-col gap-3">
        <DockButton
          label="Second Brain Notes (instant capture)"
          href="/live-coach?autostart=1&mode=notes"
          icon={<NotebookPen className="w-5 h-5 text-amber-300" />}
        />
        <DockButton
          label="Live Session (Sales Coach + Notes)"
          href="/live-coach?autostart=1&mode=hybrid"
          icon={<Headphones className="w-5 h-5 text-emerald-300" />}
        />
        <DockButton
          label="Realtime Voice (general)"
          href="/realtime-voice"
          icon={<Mic className="w-5 h-5 text-violet-300" />}
        />
      </div>
    </>
  );
}

