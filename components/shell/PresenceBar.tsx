import Link from "next/link";
import { Zap } from "lucide-react";
import { TOKENS } from "@/lib/ui/tokens";

export function PresenceBar() {
    return (
        <header className={`h-14 flex items-center px-6 justify-between shrink-0 z-20 border-b ${TOKENS.COLORS.glass.bg} ${TOKENS.COLORS.glass.border} ${TOKENS.BLUR.md}`}>
            {/* Region A: Connection Indicator & Logo */}
            <div className="flex items-center gap-4">
                <Link href="/" className="flex items-center gap-3 font-bold text-violet-100 group">
                    <div className={`w-8 h-8 bg-violet-600 ${TOKENS.RADIUS.sm} flex items-center justify-center text-white shadow-lg shadow-violet-900/20 group-hover:shadow-violet-600/40 transition-shadow`}>P</div>
                    <span className="tracking-tight text-lg">Pulse</span>
                </Link>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                    <span className="text-[10px] font-medium text-emerald-400 uppercase tracking-wider">Online</span>
                </div>
            </div>

            {/* Region A: Status Indicators */}
            <div className={`flex items-center gap-4 text-xs ${TOKENS.COLORS.text.dim}`}>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/5">
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quiet Mode</span>
                </div>
            </div>
        </header>
    );
}
