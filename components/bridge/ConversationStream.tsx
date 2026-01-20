"use client";

import { useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import { Message } from "@/lib/runtime/types";

interface ConversationStreamProps {
    messages: Message[];
}

export function ConversationStream({ messages }: ConversationStreamProps) {
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
            <div className="max-w-4xl mx-auto flex flex-col justify-end min-h-full">
                {messages.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-300 dark:text-zinc-700 opacity-50 select-none">
                        <div className="w-32 h-32 bg-gradient-to-tr from-zinc-100 to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <div className="w-4 h-4 rounded-full bg-zinc-200 dark:bg-zinc-800" />
                        </div>
                        <p className="text-sm font-medium">Pulse Bridge is ready.</p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble key={msg.id} message={msg} />
                    ))
                )}
                <div ref={bottomRef} className="h-4" />
            </div>
        </div>
    );
}
