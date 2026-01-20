"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { TOKENS } from "@/lib/ui/tokens";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
}

export function PrimaryButton({ children, className = "", ...props }: PrimaryButtonProps) {
    return (
        <button
            className={`
                ${TOKENS.COLORS.primary.bg} 
                ${TOKENS.COLORS.primary.text} 
                ${TOKENS.COLORS.primary.hover}
                ${TOKENS.RADIUS.full}
                px-6 py-2.5
                font-medium text-sm
                transition-colors duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `}
            {...props}
        >
            {children}
        </button>
    );
}
