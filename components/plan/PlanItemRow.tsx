"use client";

import { useOverlays } from "@/components/shell/overlays/OverlayContext";
import { cn } from "@/lib/utils";
import { Check, X, HelpCircle, User, Zap } from "lucide-react";
import { TOKENS } from "@/lib/ui/tokens";
import { PrimaryButton } from "@/components/ui/PrimaryButton";

export interface PlanItem {
    id: string;
    title: string;
    status: 'done' | 'pending' | 'blocked';
    source: 'you' | 'pulse';
    timestamp: string; // ISO
    explainable?: boolean;
    confirmRequired?: boolean;
}

interface PlanItemRowProps {
    item: PlanItem;
    onApprove: (id: string) => void;
    onDecline: (id: string) => void;
}

export function PlanItemRow({ item, onApprove, onDecline }: PlanItemRowProps) {
    const { setExplanationActive } = useOverlays();

    const isPending = item.confirmRequired && item.status === 'pending';

    const timeString = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
        <div className={`group flex items-center justify-between p-4 ${TOKENS.COLORS.glass.bg} ${TOKENS.COLORS.glass.border} border ${TOKENS.RADIUS.sm} mb-3 ${TOKENS.SHADOW.sm} transition-all hover:bg-white/10`}>
            <div className="flex items-center gap-4">
                {/* Status Icon */}
                <div className={cn(
                    "w-2 h-2 rounded-full shrink-0 shadow-[0_0_8px_currentColor]",
                    item.status === 'done' ? "text-emerald-500 bg-emerald-500" :
                        item.status === 'blocked' ? "text-rose-500 bg-rose-500" :
                            "text-amber-400 bg-amber-400"
                )} />

                <div className="flex flex-col gap-1">
                    <span className={cn("text-sm font-medium", TOKENS.COLORS.text.heading, item.status === 'blocked' && "line-through opacity-50")}>
                        {item.title}
                    </span>
                    <div className={cn("flex items-center gap-3 text-xs", TOKENS.COLORS.text.dim)}>
                        <span className="flex items-center gap-1.5 bg-white/5 border border-white/5 px-2 py-0.5 rounded-md">
                            {item.source === 'you' ? <User className="w-3 h-3 text-violet-400" /> : <Zap className="w-3 h-3 text-amber-400" />}
                            <span className="capitalize">{item.source}</span>
                        </span>
                        <span>{timeString}</span>
                        {item.status === 'pending' && !item.confirmRequired && (
                            <span className="text-amber-400">In Progress</span>
                        )}
                        {item.status === 'blocked' && (
                            <span className="text-rose-400">Blocked</span>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                {/* Explanation Affordance */}
                {item.explainable && (
                    <button
                        onClick={() => setExplanationActive(true)}
                        className="p-2 text-zinc-500 hover:text-violet-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Why?"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                )}

                {/* Inline Actions for Pending Confirmations */}
                {isPending && (
                    <div className="flex items-center gap-2 pl-2 border-l border-white/5 ml-2">
                        <button
                            onClick={() => onDecline(item.id)}
                            className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                            title="Decline"
                        >
                            <X className="w-4 h-4" />
                        </button>
                        <PrimaryButton
                            onClick={() => onApprove(item.id)}
                            className="px-3 py-1.5 h-auto text-xs"
                        >
                            Accept
                        </PrimaryButton>
                    </div>
                )}
            </div>
        </div>
    );
}
