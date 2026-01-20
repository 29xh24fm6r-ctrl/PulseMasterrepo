export const TOKENS = {
    RADIUS: {
        sm: "rounded-2xl", // 16px - Base for cards
        md: "rounded-3xl", // 24px - Large containers
        lg: "rounded-[32px]", // 32px - Overlay roots
        full: "rounded-full", // Buttons
    },
    BLUR: {
        sm: "backdrop-blur-sm", // 4px
        md: "backdrop-blur-md", // 12px - Standard glass
        lg: "backdrop-blur-xl", // 24px - Heavy overlays
    },
    SHADOW: {
        sm: "shadow-sm",
        md: "shadow-md hover:shadow-lg transition-shadow",
        glow: "shadow-[0_0_20px_rgba(139,92,246,0.15)]", // Violet glow
    },
    COLORS: {
        glass: {
            bg: "bg-zinc-900/60",
            border: "border-white/5",
            hover: "hover:bg-zinc-800/60 hover:border-white/10",
        },
        primary: {
            bg: "bg-white",
            text: "text-zinc-950",
            hover: "hover:bg-zinc-200",
        },
        secondary: {
            bg: "bg-transparent",
            text: "text-zinc-400",
            border: "border-zinc-800",
            hover: "hover:text-white hover:border-zinc-700",
        },
        text: {
            heading: "text-zinc-100",
            body: "text-zinc-400",
            dim: "text-zinc-600",
        }
    },
    DENSITY: {
        compact: "p-3",
        comfortable: "p-5",
        spacious: "p-8",
    }
} as const;
