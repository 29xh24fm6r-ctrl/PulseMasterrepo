// Coach Chat Window
// app/components/coaching/CoachChatWindow.tsx

"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CoachMessageBubble } from "./CoachMessageBubble";
import { TypingIndicator } from "@/components/ui/TypingIndicator";
import { LoadingState } from "@/components/ui/LoadingState";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

interface CoachChatWindowProps {
  messages: ChatMessage[];
  loading?: boolean;
}

export function CoachChatWindow({ messages, loading }: CoachChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filter out system messages for display
  const displayMessages = messages.filter((m) => m.role !== "system");

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {displayMessages.length === 0 ? (
        <div className="text-center py-8 text-sm text-zinc-400">
          Start a conversation with your coach
        </div>
      ) : (
        <>
          {displayMessages.map((message) => (
            <CoachMessageBubble key={message.id} message={message} />
          ))}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-zinc-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="bg-zinc-800/50 rounded-lg p-3 text-sm text-zinc-300">
                  Thinking...
                </div>
              </div>
            </div>
          )}
        </>
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

