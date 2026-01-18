import { motion } from "framer-motion";
import { PulsePresenceState } from "@/lib/companion/presenceState";

type PulseAvatarProps = {
    size?: "sm" | "md" | "lg";
    state?: PulsePresenceState;
};

export function PulseAvatar({ size = "md", state = "idle" }: PulseAvatarProps) {
    const sizeClasses = {
        sm: "w-6 h-6",
        md: "w-10 h-10",
        lg: "w-16 h-16"
    };

    // Glow colors based on state
    // Idle: Soft white/blue
    // Engaged: Brighter blue/cyan
    // Active: Emerald/Cyan mix or energetic pulse
    const glowColor = state === "active" ? "rgba(34, 211, 238, 0.6)" :
        state === "engaged" ? "rgba(255, 255, 255, 0.4)" :
            "rgba(255, 255, 255, 0.1)";

    return (
        <div className={`relative flex items-center justify-center ${sizeClasses[size]}`}>
            {/* Ambient Glow */}
            <motion.div
                className="absolute inset-0 rounded-full blur-lg"
                animate={{
                    opacity: state === "active" ? [0.4, 0.7, 0.4] :
                        state === "engaged" ? 0.5 : 0.2,
                    scale: state === "active" ? [1, 1.1, 1] : 1
                }}
                transition={{
                    duration: state === "active" ? 2 : 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                style={{
                    backgroundColor: glowColor
                }}
            />

            {/* Core Orb */}
            <div className="relative z-10 w-full h-full rounded-full bg-gradient-to-br from-white/20 to-white/5 border border-white/10 shadow-inner backdrop-blur-sm overflow-hidden flex items-center justify-center">

                {/* Internal Light Reflection */}
                <div className="absolute top-1 left-2 w-1/3 h-1/3 rounded-full bg-white/40 blur-[2px]" />

                {/* Pulse "P" Glyph (Minimalist) */}
                <span className={`font-semibold text-white/90 ${size === "sm" ? "text-[10px]" : size === "md" ? "text-sm" : "text-lg"}`}>
                    P
                </span>
            </div>
        </div>
    );
}
