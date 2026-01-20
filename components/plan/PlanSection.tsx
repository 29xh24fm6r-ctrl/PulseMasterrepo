"use client";

import { ReactNode } from "react";

import { TOKENS } from "@/lib/ui/tokens";

interface PlanSectionProps {
    title: string;
    children: ReactNode;
    isEmpty: boolean;
    emptyMessage: string;
}

export function PlanSection({ title, children, isEmpty, emptyMessage }: PlanSectionProps) {
    return (
        <div className="mb-8">
            <h2 className={`text-xs font-semibold ${TOKENS.COLORS.text.dim} uppercase tracking-wider mb-4 px-2`}>
                {title}
            </h2>
            <div className="space-y-2">
                {isEmpty ? (
                    <div className={`p-8 text-center border border-dashed border-white/10 ${TOKENS.RADIUS.md} bg-white/5`}>
                        <p className={`${TOKENS.COLORS.text.dim} text-sm`}>{emptyMessage}</p>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}
