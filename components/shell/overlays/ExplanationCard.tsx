"use client";

import { useOverlays } from "./OverlayContext";

export function ExplanationCard() {
    const { state, setExplanationActive } = useOverlays();

    if (!state.explanationActive) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[20] w-80">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-xl">
                <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white">Insight</h3>
                    <button
                        onClick={() => setExplanationActive(false)}
                        className="text-zinc-500 hover:text-white"
                    >
                        ×
                    </button>
                </div>
                <p className="text-sm text-zinc-400">
                    This is an explanation card overlay that provides context-aware help without blocking the UI.
                </p>
            </div>
        </div>
    );
}
