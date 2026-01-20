"use client";

import { ReactNode } from "react";
import { TOKENS } from "@/lib/ui/tokens"; // Assuming alias to lib

interface SurfaceCardProps {
    children: ReactNode;
    className?: string;
    hoverEffect?: boolean;
    animateIn?: boolean; // If we want to add motion later
}

export function SurfaceCard({ children, className = "", hoverEffect = false }: SurfaceCardProps) {
    return (
        <div
            className={`
                relative 
                ${TOKENS.COLORS.glass.bg} 
                ${TOKENS.COLORS.glass.border} 
                border 
                ${TOKENS.RADIUS.sm} 
                ${TOKENS.BLUR.md} 
                ${className}
                ${hoverEffect ? `transition-all duration-300 ${TOKENS.COLORS.glass.hover} ${TOKENS.SHADOW.md}` : ''}
            `}
        >
            {children}
        </div>
    );
}
