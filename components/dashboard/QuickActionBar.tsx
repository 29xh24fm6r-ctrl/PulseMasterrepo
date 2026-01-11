"use client";

import { Mic, Video, Plus, BrainCircuit } from "lucide-react";

export const QuickActionBar = () => {
    return (
        <div className="flex items-center gap-2">
            {/* Quick Capture (Brain) */}
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors" title="Quick Capture">
                <BrainCircuit className="w-5 h-5" />
            </button>

            {/* Quick Add (Task/Note) */}
            <button className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors" title="Quick Add">
                <Plus className="w-5 h-5" />
            </button>

            {/* Join Meeting (Contextual - Active State Mockup) */}
            {/* If a meeting were active, this would be Red/Green and prominent */}
            <button className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-md transition-colors font-medium text-sm">
                <Video className="w-4 h-4" />
                <span>Join</span>
            </button>

            {/* Voice Mode */}
            <button className="p-2 bg-zinc-100 text-zinc-900 hover:bg-white rounded-full transition-colors shadow-sm" title="Voice Mode">
                <Mic className="w-5 h-5" />
            </button>
        </div>
    );
};
