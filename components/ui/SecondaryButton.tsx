"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import { TOKENS } from "@/lib/ui/tokens";

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: ReactNode;
}

export function SecondaryButton({ children, className = "", ...props }: SecondaryButtonProps) {
    return (
        <button
            className={`
                ${TOKENS.COLORS.secondary.bg} 
                ${TOKENS.COLORS.secondary.text} 
                ${TOKENS.COLORS.secondary.border} 
                ${TOKENS.COLORS.secondary.hover}
                ${TOKENS.RADIUS.full}
                border
                px-6 py-2.5
                font-medium text-sm
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
                ${className}
            `}
            {...props}
        >
            {children}
        </button>
    );
}
