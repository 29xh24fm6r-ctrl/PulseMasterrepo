import { TOKENS } from "@/lib/ui/tokens";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useOverlays } from "./OverlayContext";

export function IPPReplacement() {
    const { ippActive, setIPPActive } = useOverlays();

    if (!ippActive) return null;

    return (
        <div className={`fixed inset-0 z-[50] ${TOKENS.COLORS.glass.bg} ${TOKENS.BLUR.lg} flex flex-col items-center justify-center p-6 animate-in fade-in duration-500`}>
            <div className={`max-w-md w-full text-center ${TOKENS.COLORS.glass.bg} border-white/10 border ${TOKENS.RADIUS.lg} p-8 ${TOKENS.SHADOW.glow}`}>
                <h1 className="text-3xl font-bold mb-4 tracking-tight text-white drop-shadow-md">System Paused</h1>
                <p className={`mb-8 ${TOKENS.COLORS.text.body} text-lg leading-relaxed`}>
                    Pulse has encountered a critical state and cannot proceed safely.
                </p>
                <PrimaryButton
                    onClick={() => setIPPActive(false)}
                    className="w-full bg-white text-black hover:bg-zinc-200"
                >
                    Acknowledge & Dismiss
                </PrimaryButton>
            </div>
        </div>
    );
}
