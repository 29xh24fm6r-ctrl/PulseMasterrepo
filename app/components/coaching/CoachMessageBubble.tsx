// Coach Message Bubble
// app/components/coaching/CoachMessageBubble.tsx

"use client";

import { motion } from "framer-motion";
import React from "react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

interface CoachMessageBubbleProps {
  message: ChatMessage;
}

export function CoachMessageBubble({ message }: CoachMessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
        isUser ? "bg-violet-600" : "bg-zinc-800"
      }`}>
        {isUser ? (
          <span className="text-xs font-medium text-white">You</span>
        ) : (
          <div className="w-3 h-3 rounded-full bg-zinc-400" />
        )}
      </div>
      <div className={`flex-1 max-w-[80%] ${isUser ? "text-right" : ""}`}>
        <div className={`rounded-lg p-3 text-sm ${
          isUser
            ? "bg-violet-600/20 border border-violet-600/30 text-white ml-auto"
            : "bg-zinc-800/50 border border-zinc-700/50 text-zinc-300"
        }`}>
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        </div>
        {message.createdAt && (
          <div className="text-xs text-zinc-500 mt-1">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
      </div>
    </motion.div>
  );
}

