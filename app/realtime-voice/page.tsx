"use client";

import Link from "next/link";
import { VoiceChat } from "@/components/VoiceChat";

export default function RealtimeVoicePage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">🎙️ Realtime Voice</h1>
            <p className="text-sm text-zinc-400">
              Talk naturally. Pulse listens and responds in real time.
            </p>
          </div>
          <Link
            href="/home"
            className="px-4 py-2 bg-zinc-800 text-zinc-200 rounded-xl hover:bg-zinc-700"
          >
            ← Back
          </Link>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden">
          <VoiceChat
            sessionEndpoint="/api/voice/realtime-config"
            title="Pulse Voice"
            subtitle="Speak naturally • Ask for help, strategy, or coaching"
            accentColor="purple"
            className="h-[620px]"
          />
        </div>
      </div>
    </div>
  );
}

