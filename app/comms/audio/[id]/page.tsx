// Audio Capture Thread Viewer
// app/comms/audio/[id]/page.tsx

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Mic, Play, Pause, Brain, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

export default function AudioThreadPage() {
  const params = useParams();
  const messageId = params.id as string;

  const [message, setMessage] = useState<any>(null);
  const [responsibilities, setResponsibilities] = useState<any[]>([]);
  const [promises, setPromises] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [speakers, setSpeakers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [identifyingSpeaker, setIdentifyingSpeaker] = useState<string | null>(null);

  useEffect(() => {
    if (messageId) {
      loadAudioThread();
    }
  }, [messageId]);

  useEffect(() => {
    return () => {
      if (audioElement) {
        audioElement.pause();
        audioElement.src = "";
      }
    };
  }, [audioElement]);

  async function loadAudioThread() {
    try {
      const res = await fetch(`/api/comms/audio/${messageId}`);
      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
        setResponsibilities(data.responsibilities || []);
        setPromises(data.promises || []);
        setTasks(data.tasks || []);
        setSpeakers(data.speakers || []);
        setContacts(data.contacts || []);
      }
    } catch (err) {
      console.error("Failed to load audio thread:", err);
    } finally {
      setLoading(false);
    }
  }

  function togglePlayback() {
    if (!message?.audio_url) {
      alert("Audio URL not available");
      return;
    }

    if (playing && audioElement) {
      audioElement.pause();
      setPlaying(false);
    } else {
      const audio = new Audio(message.audio_url);
      audio.play();
      audio.onended = () => setPlaying(false);
      audio.onerror = () => {
        alert("Failed to play audio. Audio URL may not be accessible.");
        setPlaying(false);
      };
      setAudioElement(audio);
      setPlaying(true);
    }
  }

  async function captureToBrain() {
    try {
      const res = await fetch("/api/comms/audio/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commMessageId: messageId }),
      });
      if (res.ok) {
        alert("Audio captured to Second Brain!");
      }
    } catch (err) {
      console.error("Failed to capture to brain:", err);
    }
  }

  async function identifySpeaker(unknownSpeakerId: string, contactId: string) {
    setIdentifyingSpeaker(unknownSpeakerId);
    try {
      const res = await fetch("/api/voice/identity/identify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unknownSpeakerId,
          contactId,
        }),
      });
      if (res.ok) {
        await loadAudioThread(); // Reload to show updated speaker
      }
    } catch (err) {
      console.error("Failed to identify speaker:", err);
    } finally {
      setIdentifyingSpeaker(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
        <div className="text-zinc-400">Loading audio thread...</div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <div className="max-w-4xl mx-auto text-center text-zinc-400">
          Audio thread not found.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mic className="w-6 h-6 text-violet-400" />
            <h1 className="text-2xl font-bold text-white">
              {message.subject || "Audio Recording"}
            </h1>
          </div>
          <div className="flex gap-2">
            {message.audio_url && (
              <button
                onClick={togglePlayback}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {playing ? "Pause" : "Play"}
              </button>
            )}
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
          {/* Transcript */}
          <div className="md:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-white">Transcript</h2>
            
            {/* Speaker-segmented transcript */}
            {speakers.length > 0 ? (
              <div className="space-y-3">
                {speakers.map((speaker: any, idx: number) => {
                  const speakerName = speaker.voice_profiles?.contact_name || 
                                     speaker.voice_unknown_speakers?.label || 
                                     speaker.speaker_label;
                  const isKnown = !!speaker.speaker_profile_id;
                  const isUnknown = !!speaker.unknown_speaker_id;
                  
                  return (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3 ${
                        isKnown
                          ? "border-blue-500/30 bg-blue-500/5"
                          : isUnknown
                          ? "border-zinc-600/30 bg-zinc-700/10"
                          : "border-zinc-700 bg-zinc-800/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded ${
                              isKnown
                                ? "bg-blue-500/20 text-blue-400"
                                : isUnknown
                                ? "bg-zinc-600/20 text-zinc-400"
                                : "bg-zinc-700/20 text-zinc-500"
                            }`}
                          >
                            {speakerName}
                          </span>
                          {speaker.confidence > 0 && (
                            <span className="text-xs text-zinc-500">
                              {Math.round(speaker.confidence * 100)}% confidence
                            </span>
                          )}
                        </div>
                        {isUnknown && (
                          <button
                            onClick={() => {
                              // Show contact selector
                              const contactId = prompt("Enter contact ID or name to identify this speaker:");
                              if (contactId) {
                                identifySpeaker(speaker.unknown_speaker_id, contactId);
                              }
                            }}
                            disabled={identifyingSpeaker === speaker.unknown_speaker_id}
                            className="text-xs px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded disabled:opacity-50"
                          >
                            {identifyingSpeaker === speaker.unknown_speaker_id ? "Identifying..." : "Identify"}
                          </button>
                        )}
                      </div>
                      <div className="text-sm text-zinc-300">{speaker.transcript_segment}</div>
                      {speaker.start_time !== undefined && speaker.end_time !== undefined && (
                        <div className="text-xs text-zinc-500 mt-1">
                          {Math.round(speaker.start_time)}s - {Math.round(speaker.end_time)}s
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-sm text-zinc-300 whitespace-pre-wrap bg-zinc-800/30 rounded-lg p-4">
                {message.body || "No transcript available."}
              </div>
            )}
            <div className="text-xs text-zinc-400">
              <div>Occurred: {new Date(message.occurred_at).toLocaleString()}</div>
              {message.from_identity && <div>Participants: {message.from_identity}</div>}
              {message.raw_data?.duration_seconds && (
                <div>Duration: {Math.round(message.raw_data.duration_seconds)}s</div>
              )}
            </div>
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
                  Promises Detected
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

