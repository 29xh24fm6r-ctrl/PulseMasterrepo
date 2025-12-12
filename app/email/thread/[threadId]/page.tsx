// Email Thread Page
// app/email/thread/[threadId]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Mail, Copy, Check } from "lucide-react";

interface ReplyDraft {
  style: "short_ack" | "full_reply" | "clarification";
  label: string;
  body: string;
}

export default function EmailThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;

  const [thread, setThread] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [drafts, setDrafts] = useState<ReplyDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    if (threadId) {
      loadThread();
    }
  }, [threadId]);

  async function loadThread() {
    // TODO: Implement actual thread loading from API
    // For now, just set loading to false
    setLoading(false);
  }

  async function generateDrafts() {
    if (!messages || messages.length === 0) {
      alert("No messages found in thread");
      return;
    }

    setGenerating(true);
    try {
      const latestMessage = messages[0];
      const res = await fetch("/api/email/reply-drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId: threadId,
          messageId: latestMessage.id,
        }),
      });

      const data = await res.json();
      if (res.ok && data.drafts) {
        setDrafts(data.drafts);
      } else {
        alert("Failed to generate drafts");
      }
    } catch (err) {
      console.error("Failed to generate drafts:", err);
      alert("Failed to generate drafts");
    } finally {
      setGenerating(false);
    }
  }

  async function copyToClipboard(text: string, index: number) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading thread...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-6 h-6 text-violet-400" />
            <h1 className="text-2xl font-bold text-white">
              {thread?.subject || "Email Thread"}
            </h1>
          </div>
          <button
            onClick={generateDrafts}
            disabled={generating}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? "Generating..." : "Generate Reply Drafts"}
          </button>
        </div>

        {/* Messages */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-white">Messages</h2>
          {messages.length === 0 ? (
            <div className="text-sm text-zinc-400">No messages found.</div>
          ) : (
            <div className="space-y-4">
              {messages.map((message, idx) => (
                <div
                  key={idx}
                  className="border border-zinc-700 rounded-lg p-4 bg-zinc-800/30"
                >
                  <div className="text-sm font-medium text-white mb-2">
                    {message.is_incoming ? "From" : "To"}: {message.from_address || "Unknown"}
                  </div>
                  <div className="text-xs text-zinc-400 mb-2">
                    {new Date(message.sent_at).toLocaleString()}
                  </div>
                  <div className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {message.body || message.snippet || "No content"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reply Drafts */}
        {drafts.length > 0 && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Reply Drafts</h2>
            <div className="space-y-4">
              {drafts.map((draft, idx) => (
                <div
                  key={idx}
                  className="border border-violet-500/30 rounded-lg p-4 bg-violet-500/5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium text-violet-400">{draft.label}</div>
                    <button
                      onClick={() => copyToClipboard(draft.body, idx)}
                      className="px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    value={draft.body}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 resize-none"
                    rows={Math.min(10, draft.body.split("\n").length)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

