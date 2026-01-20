"use client";

import { CheckCircle2, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";

export type PlanInfo = {
    planName: 'Free' | 'Plus' | 'Pro';
    status: 'active' | 'trialing' | 'past_due' | 'canceled';
    renewsOn?: string; // ISO
};

interface PlanCardProps {
    plan: PlanInfo;
}

import { TOKENS } from "@/lib/ui/tokens";

export function PlanCard({ plan }: PlanCardProps) {
    return (
        <div className={`${TOKENS.COLORS.glass.bg} ${TOKENS.COLORS.glass.border} border ${TOKENS.RADIUS.md} p-6 shadow-sm mb-8`}>
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className={`text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1`}>Current Plan</h3>
                    <div className="flex items-center gap-2">
                        <span className={`text-2xl font-bold ${TOKENS.COLORS.text.heading}`}>{plan.planName} Plan</span>
                        <span className={cn(
                            "px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                            plan.status === 'active' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                plan.status === 'trialing' ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" :
                                    "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                            {plan.status.replace('_', ' ')}
                        </span>
                    </div>
                </div>
                <CreditCard className="w-6 h-6 text-zinc-500" />
            </div>

            <div className={`flex flex-col gap-2 text-sm ${TOKENS.COLORS.text.body} mb-6`}>
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Full Pulse Brain access</span>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>7-day state retention</span>
                </div>
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Standard voice coordination</span>
                </div>
            </div>

            {plan.renewsOn && (
                <div className={`text-xs ${TOKENS.COLORS.text.dim} border-t ${TOKENS.COLORS.glass.border} pt-4`}>
                    Renews on {new Date(plan.renewsOn).toLocaleDateString()}
                </div>
            )}
        </div>
    );
}
