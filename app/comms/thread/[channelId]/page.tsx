// Comms Thread View
// app/comms/thread/[channelId]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { MessageSquare, Phone, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { extractResponsibilitiesFromComms, upsertResponsibilitiesForCommsMessage } from "@/lib/comms/responsibilities";

export default function CommsThreadPage() {
  const params = useParams();
  const channelId = params.channelId as string;

  const [channel, setChannel] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [responsibilities, setResponsibilities] = useState<any[]>([]);
  const [promises, setPromises] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescanning, setRescanning] = useState(false);

  useEffect(() => {
    if (channelId) {
      loadThread();
    }
  }, [channelId]);

  async function loadThread() {
    try {
      // Load channel
      const channelRes = await fetch(`/api/comms/channel/${channelId}`);
      const channelData = await channelRes.json();
      if (channelRes.ok) {
        setChannel(channelData.channel);
        setMessages(channelData.messages || []);
        setResponsibilities(channelData.responsibilities || []);
        setPromises(channelData.promises || []);
        setTasks(channelData.tasks || []);
      }
    } catch (err) {
      console.error("Failed to load thread:", err);
    } finally {
      setLoading(false);
    }
  }

  async function rescanResponsibilities() {
    setRescanning(true);
    try {
      // Re-extract from last N messages
      const recentMessages = messages.slice(0, 5);
      // This would need an API endpoint to trigger re-scan
      // For now, just reload
      await loadThread();
    } catch (err) {
      console.error("Failed to rescan:", err);
    } finally {
      setRescanning(false);
    }
  }

  async function captureToBrain() {
    try {
      const res = await fetch("/api/comms/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelId }),
      });
      if (res.ok) {
        alert("Thread captured to Second Brain!");
      }
    } catch (err) {
      console.error("Failed to capture to brain:", err);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading thread...</div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto text-center text-zinc-400">
          Thread not found.
        </div>
      </div>
    );
  }

  const isSMS = channel.channel_type === "sms";
  const Icon = isSMS ? MessageSquare : Phone;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-6 h-6 text-violet-400" />
            <h1 className="text-2xl font-bold text-white">
              {channel.label || channel.external_id || "Thread"}
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={rescanResponsibilities}
              disabled={rescanning}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${rescanning ? "animate-spin" : ""}`} />
              Re-scan
            </button>
            <button
              onClick={captureToBrain}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              Send to Brain
            </button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Messages */}
          <div className="md:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Messages</h2>
            {messages.length === 0 ? (
              <div className="text-sm text-zinc-400">No messages found.</div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, idx) => (
                  <div
                    key={idx}
                    className={`border rounded-lg p-4 ${
                      message.direction === "outgoing"
                        ? "border-blue-500/30 bg-blue-500/5 ml-8"
                        : "border-zinc-700 bg-zinc-800/30 mr-8"
                    }`}
                  >
                    <div className="text-xs text-zinc-400 mb-2">
                      {message.direction === "outgoing" ? "You" : message.from_identity} ·{" "}
                      {new Date(message.occurred_at).toLocaleString()}
                    </div>
                    {message.subject && (
                      <div className="text-sm font-medium text-white mb-2">{message.subject}</div>
                    )}
                    <div className="text-sm text-zinc-300 whitespace-pre-wrap">
                      {message.body || "No content"}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sidebar: Responsibilities, Promises, Tasks */}
          <div className="space-y-4">
            {/* Responsibilities */}
            {responsibilities.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Responsibilities
                </h3>
                <div className="space-y-2">
                  {responsibilities.map((resp: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-xs bg-amber-500/10 border border-amber-500/30 rounded p-2"
                    >
                      <div className="font-medium text-amber-400">{resp.required_action}</div>
                      <div className="text-zinc-400 mt-1">
                        {resp.responsibility_type} · {resp.urgency}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Promises */}
            {promises.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-400" />
                  Promises
                </h3>
                <div className="space-y-2">
                  {promises.map((promise: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-xs bg-blue-500/10 border border-blue-500/30 rounded p-2"
                    >
                      <div className="font-medium text-blue-400">{promise.promise_text}</div>
                      {promise.promise_due_at && (
                        <div className="text-zinc-400 mt-1">
                          Due: {new Date(promise.promise_due_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tasks */}
            {tasks.length > 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">Related Tasks</h3>
                <div className="space-y-2">
                  {tasks.map((task: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-xs bg-zinc-800/50 border border-zinc-700 rounded p-2"
                    >
                      <div className="font-medium text-white">{task.title}</div>
                      <div className="text-zinc-400 mt-1">Status: {task.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

