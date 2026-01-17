import React, { useRef, useState } from "react";
import { Mic, MicOff, Loader2, Square } from "lucide-react";

interface QuickTalkButtonProps {
    state: "idle" | "listening" | "processing" | "success" | "error";
    onStart: () => void;
    onStop: () => void;
    onCancel: () => void;
}

export function QuickTalkButton({ state, onStart, onStop, onCancel }: QuickTalkButtonProps) {
    const [isHovered, setIsHovered] = useState(false);
    const pressTimer = useRef<NodeJS.Timeout | null>(null);
    const isHoldMode = useRef(false);

    const handlePointerDown = (e: React.PointerEvent) => {
        if (state !== "idle") return;

        // Start hold timer
        isHoldMode.current = false;
        pressTimer.current = setTimeout(() => {
            isHoldMode.current = true;
        }, 200); // 200ms threshold for "hold"

        onStart();
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (state !== "listening") return;

        if (pressTimer.current) clearTimeout(pressTimer.current);

        if (isHoldMode.current) {
            // Was holding -> Stop
            onStop();
        } else {
            // Was a tap -> Keep listening (Toggle mode)
            // Do nothing, let user click again or leave it
        }
    };

    const handleClick = (e: React.MouseEvent) => {
        // If we processed a hold, ignore the click
        if (isHoldMode.current) {
            isHoldMode.current = false;
            return;
        }

        // Tap toggle logic
        if (state === "listening") {
            onStop();
        } else if (state === "idle") {
            // Already handled in pointerDown, but if pointerDown failed for some reason:
            // onStart();
        }
    };

    return (
        <button
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
                w-full rounded-xl px-4 py-3 flex items-center justify-center gap-2 font-medium bg-white/10 border border-white/10 transition-all select-none
                ${state === "listening" ? "bg-red-500/20 border-red-500/50 text-red-200 animate-pulse" : "hover:bg-white/15 text-white"}
                ${state === "processing" ? "opacity-75 cursor-wait" : ""}
            `}
        >
            {state === "idle" && (
                <>
                    <Mic className="w-4 h-4" />
                    <span>Hold to Talk</span>
                </>
            )}

            {state === "listening" && (
                <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>Listening...</span>
                </>
            )}

            {state === "processing" && (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Thinking...</span>
                </>
            )}

            {state === "success" && (
                <span className="text-emerald-400">Done</span>
            )}

            {state === "error" && (
                <span className="text-red-400">Error</span>
            )}
        </button>
    );
}
