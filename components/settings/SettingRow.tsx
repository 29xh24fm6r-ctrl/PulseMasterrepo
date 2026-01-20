"use client";

import { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface SettingRowProps {
    label: string;
    description?: string;
    control?: ReactNode; // If custom control needed
    type?: 'toggle' | 'text' | 'link';
    value?: boolean | string;
    onChange?: (val: any) => void;
    href?: string; // For link type
    actionLabel?: string; // For link type
}

import { TOKENS } from "@/lib/ui/tokens";

export function SettingRow({
    label,
    description,
    control,
    type = 'text',
    value,
    onChange,
    href,
    actionLabel
}: SettingRowProps) {
    return (
        <div className={`flex items-center justify-between py-4 border-b ${TOKENS.COLORS.glass.border} last:border-0`}>
            <div className="pr-4">
                <div className={`text-sm font-medium ${TOKENS.COLORS.text.heading}`}>{label}</div>
                {description && <div className={`text-xs ${TOKENS.COLORS.text.dim} mt-0.5`}>{description}</div>}
            </div>

            <div className="shrink-0">
                {control ? control : (
                    <>
                        {type === 'text' && (
                            <span className={`text-sm ${TOKENS.COLORS.text.body} font-mono`}>{value as string}</span>
                        )}
                        {type === 'toggle' && (
                            <button
                                onClick={() => onChange?.(!(value as boolean))}
                                className={cn(
                                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-black",
                                    value ? "bg-violet-600" : "bg-zinc-700 hover:bg-zinc-600"
                                )}
                            >
                                <span
                                    className={cn(
                                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                                        value ? "translate-x-6" : "translate-x-1"
                                    )}
                                />
                            </button>
                        )}
                        {type === 'link' && href && (
                            <Link href={href} className="text-sm font-medium text-violet-400 hover:text-violet-300 hover:underline">
                                {actionLabel || 'View'}
                            </Link>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
