"use client";

import { ReactNode } from "react";

import { TOKENS } from "@/lib/ui/tokens";

interface SettingsSectionProps {
    title: string;
    children: ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
    return (
        <div className="mb-8">
            <h2 className={`text-xs font-semibold ${TOKENS.COLORS.text.dim} uppercase tracking-wider mb-4 px-2`}>
                {title}
            </h2>
            <div className={`${TOKENS.COLORS.glass.bg} ${TOKENS.COLORS.glass.border} border ${TOKENS.RADIUS.md} px-6 shadow-sm overflow-hidden`}>
                {children}
            </div>
        </div>
    );
}
