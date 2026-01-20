"use client";

import { ReactNode } from "react";
import { TOKENS } from "@/lib/ui/tokens";

interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: ReactNode;
    className?: string;
}

export function SectionHeader({ title, subtitle, action, className = "" }: SectionHeaderProps) {
    return (
        <div className={`flex items-end justify-between mb-6 ${className}`}>
            <div>
                <h2 className={`text-xl font-semibold tracking-tight ${TOKENS.COLORS.text.heading}`}>
                    {title}
                </h2>
                {subtitle && (
                    <p className={`mt-1 text-sm ${TOKENS.COLORS.text.body}`}>
                        {subtitle}
                    </p>
                )}
            </div>
            {action && (
                <div className="mb-0.5">
                    {action}
                </div>
            )}
        </div>
    );
}
