"use client";

import { InputHTMLAttributes } from "react";
import { TOKENS } from "@/lib/ui/tokens";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

export function TextInput({ label, className = "", ...props }: TextInputProps) {
    return (
        <div className="flex flex-col gap-2">
            {label && (
                <label className={`text-xs font-medium uppercase tracking-wider ${TOKENS.COLORS.text.dim}`}>
                    {label}
                </label>
            )}
            <input
                className={`
                    w-full
                    bg-zinc-900/30
                    border border-white/5
                    ${TOKENS.RADIUS.full}
                    px-4 py-2.5
                    ${TOKENS.COLORS.text.body}
                    placeholder:text-zinc-600
                    focus:outline-none focus:border-white/20 focus:bg-zinc-900/50
                    transition-all duration-200
                    ${className}
                `}
                {...props}
            />
        </div>
    );
}
