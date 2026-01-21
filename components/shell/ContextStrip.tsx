"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { TOKENS } from "@/lib/ui/tokens";

export function ContextStrip() {
    const [isExpanded, setIsExpanded] = useState(true);

    // Stub context
    const context = "System Context: Normal Operations - All Systems Nominal";

    return (
        <div className={`border-b ${TOKENS.COLORS.glass.border} ${TOKENS.COLORS.glass.bg} backdrop-blur-sm`}>
            {/* Region D: Context Strip */}
            import OpenPresenceButton from "@/components/presence/OpenPresenceButton";

            // ...

            export function ContextStrip() {
    // ...
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></span>
                        {context}
                        <div className="ml-4 h-4 w-px bg-white/10" />
                        <OpenPresenceButton />
                    </span>
                    <button onClick={() => setIsExpanded(false)} className="hover:text-zinc-300 transition-colors">
                        <ChevronUp className="w-3 h-3" />
                    </button>
                </div>
    )
}
{
    !isExpanded && (
        <div className="flex justify-center h-1">
            <button onClick={() => setIsExpanded(true)} className="w-12 h-1 bg-white/10 rounded-b-full hover:bg-violet-500/50 transition-colors" />
        </div>
    )
}
        </div >
    );
}
