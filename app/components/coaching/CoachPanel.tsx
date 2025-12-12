// Coach Panel
// app/components/coaching/CoachPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { useCoachPanelStore } from "./useCoachPanelStore";
import { CoachPersonaHeader } from "./CoachPersonaHeader";
import { CoachContextBanner } from "./CoachContextBanner";
import { CoachChatWindow } from "./CoachChatWindow";
import { LoadingState } from "@/components/ui/LoadingState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
}

const QUICK_SUGGESTIONS: Record<string, string[]> = {
  financial: [
    "Help me understand my spending",
    "How can I hit my savings goal faster?",
    "What should I prioritize this month?",
  ],
  strategy: [
    "Does my current 90-day plan make sense?",
    "What should I focus on this week?",
    "Help me think through my priorities",
  ],
  confidant: [
    "I'm feeling overwhelmed",
    "Help me unpack what happened today",
    "I need to process something",
  ],
  sales: [
    "Which deal should I focus on?",
    "Help me prepare for an important call",
    "How can I improve my pipeline?",
  ],
  career: [
    "How can I advance in my career?",
    "What skills should I develop?",
    "Help me think through my career path",
  ],
  productivity: [
    "What should I focus on today?",
    "Help me prioritize my tasks",
    "I'm feeling scattered",
  ],
};

export function CoachPanel() {
  const { isOpen, coachKey, origin, sessionId, initialUserMessage, closeCoach, setSessionId } =
    useCoachPanelStore();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(false);

  // Initialize session when panel opens
  useEffect(() => {
    if (isOpen && coachKey && !sessionId) {
      initializeSession();
    } else if (isOpen && sessionId && messages.length === 0) {
      // Session exists but no messages - load initial messages
      loadInitialMessages();
    }
  }, [isOpen, coachKey, sessionId]);

  // Handle initial user message
  useEffect(() => {
    if (isOpen && sessionId && initialUserMessage && messages.length > 0) {
      // Send initial message after session is ready
      handleSendMessage(initialUserMessage);
      // Clear initial message to prevent re-sending
      useCoachPanelStore.setState({ initialUserMessage: undefined });
    }
  }, [sessionId, initialUserMessage, messages.length]);

  async function initializeSession() {
    if (!coachKey) return;
    setSessionLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coaches/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coachKey,
          origin,
          initialUserMessage,
        }),
      });

      if (!res.ok) throw new Error("Failed to create session");

      const data = await res.json();
      setSessionId(data.sessionId);
      setMessages(data.initialMessages || []);
    } catch (err: any) {
      setError(err.message || "Failed to connect to coach");
    } finally {
      setSessionLoading(false);
    }
  }

  async function loadInitialMessages() {
    // For v1, we'll just use the messages from session creation
    // Later, we can load from stored messages
  }

  async function handleSendMessage(messageText?: string) {
    const text = messageText || input.trim();
    if (!text || !sessionId) return;

    setInput("");
    setLoading(true);
    setError(null);

    // Add user message to UI immediately
    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);

    try {
      const res = await fetch("/api/coaches/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          message: text,
        }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      // Add assistant response
      setMessages((prev) => [...prev, ...data.messages]);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
      // Remove user message on error (or mark it as failed)
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !coachKey) return null;

  const quickSuggestions = QUICK_SUGGESTIONS[coachKey] || [];

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex justify-end pointer-events-none"
    >
      <motion.div
        initial={{ x: 40, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 40, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg h-full bg-zinc-950 border-l border-zinc-800 shadow-xl flex flex-col pointer-events-auto"
      >
        <CoachPersonaHeader coachKey={coachKey} />
        <CoachContextBanner coachKey={coachKey} origin={origin} />

        {sessionLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <LoadingState message="Connecting to coach…" />
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <ErrorState
              message="Pulse couldn't connect to this coach right now. Try again in a moment."
              onRetry={initializeSession}
            />
          </div>
        ) : (
          <>
            <CoachChatWindow messages={messages} loading={loading} />

            <div className="p-4 border-t border-zinc-800 space-y-3">
              {quickSuggestions.length > 0 && messages.length === 0 && (
                <div className="flex flex-wrap gap-2">
                  {quickSuggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(suggestion)}
                      className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Type your message..."
                  className="min-h-[60px] resize-none bg-zinc-900 border-zinc-700 text-white"
                  disabled={loading}
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!input.trim() || loading}
                  className="bg-violet-600 hover:bg-violet-700"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

