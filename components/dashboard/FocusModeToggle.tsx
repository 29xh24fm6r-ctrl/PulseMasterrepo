"use client";

import { useState, useEffect } from "react";
import { logFocusModeToggle } from "@/lib/dashboard/telemetryClient";
import { Focus, X } from "lucide-react";

export function FocusModeToggle() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const handleToggle = () => setEnabled((prev) => !prev);
    window.addEventListener("toggleFocusMode", handleToggle);
    return () => window.removeEventListener("toggleFocusMode", handleToggle);
  }, []);

  useEffect(() => {
    document.body.classList.toggle("focus-mode", enabled);
    logFocusModeToggle(enabled);
  }, [enabled]);

  return (
    <>
      <button
        onClick={() => setEnabled(!enabled)}
        className={`fixed bottom-6 right-6 z-50 p-3 rounded-full shadow-lg transition-all ${
          enabled ? "bg-violet-600 hover:bg-violet-500 ring-2 ring-violet-400/50" : "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
        }`}
        title={enabled ? "Exit Focus Mode" : "Enter Focus Mode"}
      >
        {enabled ? <X className="w-5 h-5 text-white" /> : <Focus className="w-5 h-5 text-zinc-300" />}
      </button>

      {enabled && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
          <div className="bg-violet-600/90 backdrop-blur-sm px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
            <Focus className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">Focus Mode</span>
          </div>
        </div>
      )}
    </>
  );
}
