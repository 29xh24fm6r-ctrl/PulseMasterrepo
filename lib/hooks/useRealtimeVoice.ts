"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface UseRealtimeVoiceOptions {
  sessionEndpoint?: string;
  onMessage?: (message: Message) => void;
  onStatusChange?: (status: string) => void;
  enableLogging?: boolean;
}

type VoiceStatus = "idle" | "connecting" | "connected" | "listening" | "speaking" | "processing" | "error";

export function useRealtimeVoice(options: UseRealtimeVoiceOptions = {}) {
  const {
    sessionEndpoint = "/api/voice/session",
    onMessage,
    onStatusChange,
    enableLogging = true,
  } = options;

  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentTranscript, setCurrentTranscript] = useState<string>("");
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isAssistantSpeaking, setIsAssistantSpeaking] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartRef = useRef<number>(0);

  const updateStatus = useCallback((newStatus: VoiceStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  // Log voice session to Third Brain
  const logSession = useCallback(async () => {
    if (!enableLogging || messages.length === 0) return;

    try {
      const duration = Date.now() - sessionStartRef.current;
      await fetch("/api/voice/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "session",
          sessionId: sessionIdRef.current,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          duration,
        }),
      });
    } catch (e) {
      console.error("[Voice] Failed to log session:", e);
    }
  }, [messages, enableLogging]);

  const addMessage = useCallback((role: "user" | "assistant", content: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
    onMessage?.(message);
    return message;
  }, [onMessage]);

  const executeFunctionCall = useCallback(async (functionName: string, args: any) => {
    try {
      const res = await fetch("/api/voice/function-call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ function_name: functionName, arguments: args }),
      });

      if (!res.ok) throw new Error("Function call failed");
      const data = await res.json();
      return data.result;
    } catch (error) {
      console.error("[Voice] Function call error:", error);
      return { error: "Function call failed" };
    }
  }, []);

  const connect = useCallback(async () => {
    try {
      updateStatus("connecting");
      setError(null);
      setMessages([]);
      sessionStartRef.current = Date.now();

      // Get session token
      const sessionRes = await fetch(sessionEndpoint);
      if (!sessionRes.ok) throw new Error("Failed to get session token");
      const sessionData = await sessionRes.json();
      const token = sessionData.client_secret?.value || sessionData.client_secret;
      sessionIdRef.current = sessionData.session_id || `session-${Date.now()}`;

      if (!token) throw new Error("No session token received");

      // Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Set up audio output
      const audio = new Audio();
      audio.autoplay = true;
      audioRef.current = audio;

      pc.ontrack = (e) => {
        audio.srcObject = e.streams[0];
      };

      // Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // Create data channel
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        updateStatus("connected");
      };

      dc.onmessage = async (e) => {
        try {
          const event = JSON.parse(e.data);

          switch (event.type) {
            case "input_audio_buffer.speech_started":
              setIsUserSpeaking(true);
              updateStatus("listening");
              break;

            case "input_audio_buffer.speech_stopped":
              setIsUserSpeaking(false);
              updateStatus("processing");
              break;

            case "conversation.item.input_audio_transcription.completed":
              if (event.transcript) {
                addMessage("user", event.transcript);
              }
              break;

            case "response.audio_transcript.delta":
              setCurrentTranscript((prev) => prev + (event.delta || ""));
              setIsAssistantSpeaking(true);
              updateStatus("speaking");
              break;

            case "response.audio_transcript.done":
              if (currentTranscript || event.transcript) {
                addMessage("assistant", event.transcript || currentTranscript);
              }
              setCurrentTranscript("");
              break;

            case "response.done":
              setIsAssistantSpeaking(false);
              setCurrentTranscript("");
              updateStatus("connected");
              break;

            case "response.function_call_arguments.done":
              updateStatus("processing");
              const result = await executeFunctionCall(event.name, JSON.parse(event.arguments || "{}"));

              // Send function result back
              dc.send(JSON.stringify({
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: event.call_id,
                  output: JSON.stringify(result),
                },
              }));

              // Trigger response
              dc.send(JSON.stringify({ type: "response.create" }));
              break;

            case "error":
              console.error("[Voice] Event error:", event.error);
              setError(event.error?.message || "Unknown error");
              break;
          }
        } catch (err) {
          console.error("[Voice] Message parse error:", err);
        }
      };

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch("https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!sdpRes.ok) throw new Error("Failed to connect to OpenAI Realtime");

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err: any) {
      console.error("[Voice] Connection error:", err);
      setError(err.message);
      updateStatus("error");
      disconnect();
    }
  }, [sessionEndpoint, updateStatus, addMessage, executeFunctionCall]);

  const disconnect = useCallback(() => {
    // Log the session before disconnecting
    logSession();

    // Clean up stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clean up audio
    if (audioRef.current) {
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }

    // Clean up data channel
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    // Clean up peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    setIsUserSpeaking(false);
    setIsAssistantSpeaking(false);
    setCurrentTranscript("");
    updateStatus("idle");
  }, [logSession, updateStatus]);

  const sendTextMessage = useCallback((text: string) => {
    if (!dcRef.current || dcRef.current.readyState !== "open") return;

    addMessage("user", text);

    dcRef.current.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{ type: "input_text", text }],
      },
    }));

    dcRef.current.send(JSON.stringify({ type: "response.create" }));
  }, [addMessage]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        disconnect();
      }
    };
  }, [disconnect]);

  return {
    status,
    error,
    messages,
    currentTranscript,
    isUserSpeaking,
    isAssistantSpeaking,
    connect,
    disconnect,
    sendTextMessage,
  };
}