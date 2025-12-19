"use client";

import { Plus, Mic } from "lucide-react";

/**
 * Canonical Floating Action Buttons for Pulse Shell
 * 
 * Single source of truth for FABs - prevents duplication across pages.
 * Only the Pulse shell layout should render this component.
 */
export function FloatingActions() {
  return (
    <div className="fixed bottom-6 right-20 md:right-24 z-[60] flex flex-col items-end gap-3">
      <button
        className="h-12 w-12 rounded-full bg-purple-600 text-white shadow-lg grid place-items-center hover:scale-[1.03] active:scale-[0.98] transition"
        aria-label="Add"
        onClick={() => {
          // TODO: Open quick create menu
          console.log("Quick create clicked");
        }}
      >
        <Plus className="w-5 h-5" />
      </button>

      <button
        className="h-12 w-12 rounded-full bg-fuchsia-600 text-white shadow-lg grid place-items-center hover:scale-[1.03] active:scale-[0.98] transition"
        aria-label="Voice"
        onClick={() => {
          // TODO: Open voice input
          window.location.href = "/voice";
        }}
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );
}

