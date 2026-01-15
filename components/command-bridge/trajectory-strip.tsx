
import { TrajectoryLine } from "@/lib/trajectory/types";

export function TrajectoryStrip({ lines }: { lines: TrajectoryLine[] }) {
    if (!lines || lines.length === 0) return null;

    return (
        <div className="w-full flex flex-col items-center gap-1 pb-4 bg-black/40 backdrop-blur-md z-40 -mt-2 animate-in fade-in slide-in-from-top-2 duration-1000 delay-300">
            {lines.map((line, i) => (
                <div key={i} className="flex items-center gap-3 text-xs tracking-wide text-white/40">
                    <span className={`px-1.5 py-0.5 rounded-[2px] font-mono text-[9px] ${line.confidence > 0.8 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                        }`}>
                        {line.horizon_days}D
                    </span>
                    <span>{line.headline}</span>
                    {/* Drivers (Optional, subtle) */}
                    {line.drivers.length > 0 && (
                        <span className="flex gap-1 opacity-50">
                            {line.drivers.map(d => (
                                <span key={d} className="text-[9px] uppercase border border-white/5 px-1 rounded-sm">
                                    {d}
                                </span>
                            ))}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}
