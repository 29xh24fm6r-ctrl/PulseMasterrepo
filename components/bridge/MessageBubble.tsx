"use client";

import { useOverlays } from "@/components/shell/overlays/OverlayContext";
import { cn } from "@/lib/utils";
import { HelpCircle } from "lucide-react";
import { Message } from "@/lib/runtime/types";

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const { setExplanationActive } = useOverlays();

    if (message.role === "system") {
        return (
            <div className="flex justify-center my-4 opacity-50">
                <span className="text-xs text-zinc-500 uppercase tracking-widest font-medium px-2 py-1 bg-zinc-100 dark:bg-zinc-900 rounded-full">
                    {message.content}
                </span>
            </div>
        );
    }

    const isUser = message.role === "user";

    return (
        <div className={cn("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
            <div
                className={cn(
                    "max-w-[80%] lg:max-w-[60%] px-4 py-3 rounded-2xl text-sm leading-relaxed relative group",
                    isUser
                        ? "bg-violet-600 text-white rounded-br-none"
                        : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 rounded-bl-none border border-zinc-200 dark:border-zinc-800"
                )}
            >
                <p className="whitespace-pre-wrap">{message.content}</p>

                {/* Explanation Affordance (Pulse Only) */}
                {!isUser && message.hasExplanation && (
                    <button
                        onClick={() => setExplanationActive(true)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-zinc-400 hover:text-violet-500"
                        title="Why did Pulse say this?"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>
                )}
            </div>
        </div>
    );
}
