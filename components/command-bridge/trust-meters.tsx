'use client';
import { LifeState } from '@/lib/life-state/types';

export function TrustMeters({ state }: { state: LifeState }) {
    // Mock Data for Polish
    const domains = [
        { name: 'PULSE FINANCE', level: 'L1 - OBSERVE', pct: 85, color: 'emerald', status: 'Active' },
        { name: 'PULSE CHEF', level: 'L0 - LOCKED', pct: 35, color: 'indigo', status: 'Warming' },
        { name: 'PULSE LOGISTICS', level: 'L0 - LOCKED', pct: 15, color: 'slate', status: 'Locked' },
        { name: 'PULSE TIME', level: 'L1 - OBSERVE', pct: 60, color: 'emerald', status: 'Active' },
    ];

    return (
        <div className="h-full flex flex-col">
            <div className="flex justify-between items-end mb-4">
                <h2 className="text-white/40 text-[10px] tracking-[0.2em] font-medium uppercase font-mono">Autonomy Access</h2>
            </div>

            <div className="space-y-4 flex-1">
                {domains.map(d => (
                    <Meter key={d.name} {...d} />
                ))}
            </div>
        </div>
    );
}

function Meter({ name, level, pct, color, status }: any) {
    const colors = {
        emerald: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]',
        indigo: 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.3)]',
        slate: 'bg-slate-700'
    };
    const textColors = {
        emerald: 'text-emerald-400',
        indigo: 'text-indigo-400',
        slate: 'text-slate-500'
    };

    return (
        <div className="group cursor-default select-none">
            <div className="flex justify-between text-[10px] transition-colors mb-1.5 items-end">
                <span className="text-white/60 font-medium group-hover:text-white transition-colors duration-300 tracking-wide">{name}</span>
                <div className="text-right">
                    <div className={`${textColors[color as keyof typeof textColors]} font-mono tracking-wider font-bold`}>{level}</div>
                    <div className="text-[8px] text-white/20 uppercase tracking-widest">{status}</div>
                </div>
            </div>
            {/* Bar Container */}
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden relative">
                {/* Grid Lines */}
                <div className="absolute inset-0 w-full h-full flex justify-between px-1 z-10 pointer-events-none">
                    {[25, 50, 75].map(p => <div key={p} className="h-full w-[1px] bg-black/40" />)}
                </div>
                {/* Fill */}
                <div className={`h-full ${colors[color as keyof typeof colors]} rounded-full transition-all duration-1000 ease-out relative`} style={{ width: `${pct}%` }}>
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/50 animate-pulse" />
                </div>
            </div>
        </div>
    );
}
