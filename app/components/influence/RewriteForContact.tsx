// Message Rewrite Component
// app/components/influence/RewriteForContact.tsx

"use client";

import { useState } from "react";
import { Sparkles, Copy, RefreshCw } from "lucide-react";

interface RewriteForContactProps {
  contactId: string;
  contactName: string;
  onRewrite?: (rewritten: string) => void;
}

export function RewriteForContact({ contactId, contactName, onRewrite }: RewriteForContactProps) {
  const [originalMessage, setOriginalMessage] = useState("");
  const [intent, setIntent] = useState<"persuade" | "reassure" | "apologize" | "followup" | "update">(
    "followup"
  );
  const [rewritten, setRewritten] = useState<string | null>(null);
  const [rationale, setRationale] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRewrite() {
    if (!originalMessage.trim()) {
      alert("Please enter a message to rewrite");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/contacts/${contactId}/influence/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalMessage,
          intent,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setRewritten(data.rewritten_message);
        setRationale(data.rationale);
        if (onRewrite) {
          onRewrite(data.rewritten_message);
        }
      } else {
        alert("Failed to rewrite message");
      }
    } catch (err) {
      console.error("Failed to rewrite:", err);
      alert("Failed to rewrite message");
    } finally {
      setLoading(false);
    }
  }

  async function copyRewritten() {
    if (rewritten) {
      await navigator.clipboard.writeText(rewritten);
      alert("Copied to clipboard!");
    }
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
      <h3 className="text-lg font-semibold text-white flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-violet-400" />
        Rewrite for {contactName}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Original Message</label>
          <textarea
            value={originalMessage}
            onChange={(e) => setOriginalMessage(e.target.value)}
            placeholder="Enter your message here..."
            className="w-full h-32 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">Intent</label>
          <select
            value={intent}
            onChange={(e) =>
              setIntent(e.target.value as "persuade" | "reassure" | "apologize" | "followup" | "update")
            }
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="followup">Follow-up</option>
            <option value="persuade">Persuade</option>
            <option value="reassure">Reassure</option>
            <option value="apologize">Apologize</option>
            <option value="update">Update</option>
          </select>
        </div>

        <button
          onClick={handleRewrite}
          disabled={loading || !originalMessage.trim()}
          className="w-full px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Rewriting...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Rewrite for {contactName}
            </>
          )}
        </button>

        {rewritten && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-zinc-400">Rewritten Message</label>
              <button
                onClick={copyRewritten}
                className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-sm text-zinc-300 whitespace-pre-wrap">
              {rewritten}
            </div>
            {rationale && (
              <div className="text-xs text-zinc-500 italic">{rationale}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

