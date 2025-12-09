"use client";

import React, { useState, useEffect } from "react";
import { CoachInterface } from "./coach-interface";

interface CoachModalProps {
  coach: string;
  coachName: string;
  coachIcon: string;
  coachDescription: string;
  context?: any;
}

export function CoachModal({ coach, coachName, coachIcon, coachDescription, context }: CoachModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 hover:bg-violet-500 rounded-full shadow-lg shadow-violet-500/25 flex items-center justify-center text-2xl transition-all hover:scale-110 z-40"
        title={`Talk to ${coachName}`}
      >
        {coachIcon}
      </button>

      {/* Modal Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          {/* Modal Content */}
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{coachIcon}</span>
                <div>
                  <h2 className="font-semibold text-zinc-100">{coachName}</h2>
                  <p className="text-xs text-zinc-500">{coachDescription}</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Coach Interface */}
            <div className="flex-1 p-4 overflow-hidden">
              <CoachInterface
                coach={coach}
                coachName={coachName}
                coachIcon={coachIcon}
                coachDescription={coachDescription}
                context={context}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
