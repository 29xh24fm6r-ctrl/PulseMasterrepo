"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

import { TOKENS } from "@/lib/ui/tokens";

interface WelcomeStepProps {
    title: string;
    children: ReactNode;
    isActive: boolean;
}

export function WelcomeStep({ title, children, isActive }: WelcomeStepProps) {
    if (!isActive) return null;

    return (
        <div className="flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-forwards">
            <h1 className={`text-3xl lg:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400 mb-6`}>
                {title}
            </h1>
            <div className={`text-lg ${TOKENS.COLORS.text.body} max-w-md mx-auto leading-relaxed`}>
                {children}
            </div>
        </div>
    );
}
