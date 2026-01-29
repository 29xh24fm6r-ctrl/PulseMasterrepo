"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

interface VoiceChatProps {
  coach: string;
  context?: any;
  onTranscript?: (text: string, role: "user" | "assistant") => void;
}

export function VoiceChat({ coach, context, onTranscript }: VoiceChatProps) {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);

  const startSession = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Get ephemeral token from our API
      const tokenRes = await fetch("/api/voice/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach, context }),
      });

      if (!tokenRes.ok) {
        throw new Error("Failed to get session token");
      }

      const { client_secret } = await tokenRes.json();

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up audio element for playback
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;

      // Handle incoming audio
      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
        setIsSpeaking(true);
      };

      // Get user microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach(track => pc.addTrack(track, stream));

      // Create data channel for events
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onmessage = (e) => {
        const event = JSON.parse(e.data);
        handleRealtimeEvent(event);
      };

      // Create and set local description
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // SDP exchange proxied through our server (CSP stays first-party only)
      const sdpRes = await fetch("/api/voice/sdp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: client_secret.value, sdp: offer.sdp }),
      });

      if (!sdpRes.ok) {
        throw new Error("SDP negotiation failed");
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

      setIsActive(true);
      setIsListening(true);
    } catch (err: any) {
      console.error("Voice session error:", err);
      setError(err.message);
      cleanup();
    } finally {
      setIsConnecting(false);
    }
  }, [coach, context]);

  const handleRealtimeEvent = (event: any) => {
    switch (event.type) {
      case "input_audio_buffer.speech_started":
        setIsListening(true);
        setIsSpeaking(false);
        break;
      case "input_audio_buffer.speech_stopped":
        setIsListening(false);
        break;
      case "response.audio.started":
        setIsSpeaking(true);
        break;
      case "response.audio.done":
        setIsSpeaking(false);
        setIsListening(true);
        break;
      case "conversation.item.input_audio_transcription.completed":
        onTranscript?.(event.transcript, "user");
        break;
      case "response.audio_transcript.done":
        onTranscript?.(event.transcript, "assistant");
        break;
      case "error":
        console.error("Realtime error:", event.error);
        setError(event.error?.message || "An error occurred");
        break;
    }
  };

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }
    dcRef.current = null;
    setIsActive(false);
    setIsListening(false);
    setIsSpeaking(false);
  }, []);

  const stopSession = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <div className="flex flex-col items-center gap-4">
      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={isActive ? stopSession : startSession}
        disabled={isConnecting}
        className={`relative w-24 h-24 rounded-full transition-all duration-300 ${
          isActive
            ? isSpeaking
              ? "bg-violet-500 scale-110"
              : isListening
              ? "bg-green-500 scale-105"
              : "bg-zinc-600"
            : "bg-zinc-800 hover:bg-zinc-700"
        } ${isConnecting ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        {/* Pulse animation when active */}
        {isActive && (
          <>
            <span className={`absolute inset-0 rounded-full animate-ping ${
              isSpeaking ? "bg-violet-400" : "bg-green-400"
            } opacity-20`} />
            <span className={`absolute inset-2 rounded-full animate-pulse ${
              isSpeaking ? "bg-violet-400" : "bg-green-400"
            } opacity-30`} />
          </>
        )}
        
        {/* Icon */}
        <span className="relative z-10 text-3xl">
          {isConnecting ? "⏳" : isActive ? (isSpeaking ? "🗣️" : "👂") : "🎙️"}
        </span>
      </button>

      <div className="text-center">
        <p className="text-sm text-zinc-400">
          {isConnecting
            ? "Connecting..."
            : isActive
            ? isSpeaking
              ? "Pulse is speaking..."
              : "Listening to you..."
            : "Tap to start voice chat"}
        </p>
      </div>
    </div>
  );
}