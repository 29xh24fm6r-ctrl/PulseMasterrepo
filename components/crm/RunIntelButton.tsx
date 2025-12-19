"use client";

import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

interface RunIntelButtonProps {
  contactId: string;
  size?: "sm" | "md";
  variant?: "primary" | "ghost";
  onDone?: () => void;
  onSwitchToIntel?: () => void;
}

export function RunIntelButton({
  contactId,
  size = "md",
  variant = "primary",
  onDone,
  onSwitchToIntel,
}: RunIntelButtonProps) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    if (!contactId || loading) return;
    setLoading(true);
    setMsg(null);
    try {
      // Call Contact Intelligence API
      const res = await fetch("/api/intel/contact/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ contactId, runType: "manual" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to run intel");

      const sourcesAdded = json.sourcesAdded ?? json.sources_added ?? 0;
      const claimsAdded = json.claimsAdded ?? json.claims_added ?? 0;
      
      setMsg(`✅ Added ${sourcesAdded} sources • ${claimsAdded} claims`);
      
      // Switch to Intel tab if callback provided
      if (onSwitchToIntel) {
        onSwitchToIntel();
      }
      
      // Call onDone callback (e.g., refresh data)
      onDone?.();
      
      // Clear message after 5 seconds
      setTimeout(() => setMsg(null), 5000);
    } catch (e: any) {
      setMsg(`⚠️ ${e?.message || "Intel run failed"}`);
      setTimeout(() => setMsg(null), 5000);
    } finally {
      setLoading(false);
    }
  }

  const base =
    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition disabled:opacity-70 disabled:cursor-not-allowed";
  const primary =
    "bg-zinc-900 text-white border-zinc-800 hover:bg-zinc-800";
  const ghost =
    "bg-transparent text-zinc-200 border-zinc-800 hover:bg-zinc-900";
  const sm = "px-2 py-1 text-xs";
  const md = "";

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={run}
        disabled={loading}
        className={[
          base,
          variant === "primary" ? primary : ghost,
          size === "sm" ? sm : md,
        ]
          .filter(Boolean)
          .join(" ")}
        title="Brave Search + Pulse Agent Brief"
      >
        {loading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>🛰️ Running…</span>
          </>
        ) : msg && msg.includes("✅") ? (
          <>
            <span>✅</span>
            <span>Updated</span>
          </>
        ) : msg && msg.includes("⚠️") ? (
          <>
            <span>⚠️</span>
            <span>Failed</span>
          </>
        ) : (
          <>
            <Sparkles className="w-3 h-3" />
            <span>🕵️ Run Intelligence</span>
          </>
        )}
      </button>
      {msg && (
        <div className="text-xs text-zinc-400 whitespace-nowrap">{msg}</div>
      )}
    </div>
  );
}

