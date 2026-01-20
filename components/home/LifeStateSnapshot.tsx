import { Activity, Battery, Zap } from "lucide-react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { TOKENS } from "@/lib/ui/tokens";

export type LifeStateValue = 'Low' | 'Medium' | 'High';

export interface LifeState {
    energy: LifeStateValue;
    stress: LifeStateValue;
    momentum: LifeStateValue;
}

interface LifeStateSnapshotProps {
    state: LifeState;
}

// Helper to determine color based on value and type (stubbed primarily for clean UI)
const getStateColor = (type: 'energy' | 'stress' | 'momentum', value: LifeStateValue) => {
    if (type === 'stress') {
        return value === 'High' ? 'text-amber-400' : 'text-zinc-100';
    }
    return value === 'Low' ? 'text-zinc-500' : 'text-zinc-100';
};

export function LifeStateSnapshot({ state }: LifeStateSnapshotProps) {
    return (
        <div className="grid grid-cols-3 gap-4 w-full max-w-lg mb-12">
            <SurfaceCard className={`flex flex-col items-center gap-3 ${TOKENS.DENSITY.compact}`}>
                <Battery className="w-5 h-5 text-violet-400" />
                <span className={`text-xs font-medium ${TOKENS.COLORS.text.dim} uppercase tracking-wider`}>Energy</span>
                <span className={`text-xl font-semibold tracking-tight ${getStateColor('energy', state.energy)}`}>
                    {state.energy}
                </span>
            </SurfaceCard>

            <SurfaceCard className={`flex flex-col items-center gap-3 ${TOKENS.DENSITY.compact}`}>
                <Activity className="w-5 h-5 text-rose-400" />
                <span className={`text-xs font-medium ${TOKENS.COLORS.text.dim} uppercase tracking-wider`}>Stress</span>
                <span className={`text-xl font-semibold tracking-tight ${getStateColor('stress', state.stress)}`}>
                    {state.stress}
                </span>
            </SurfaceCard>

            <SurfaceCard className={`flex flex-col items-center gap-3 ${TOKENS.DENSITY.compact}`}>
                <Zap className="w-5 h-5 text-amber-400" />
                <span className={`text-xs font-medium ${TOKENS.COLORS.text.dim} uppercase tracking-wider`}>Momentum</span>
                <span className={`text-xl font-semibold tracking-tight ${getStateColor('momentum', state.momentum)}`}>
                    {state.momentum}
                </span>
            </SurfaceCard>
        </div>
    );
}
