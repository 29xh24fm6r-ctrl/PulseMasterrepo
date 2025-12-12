// Voice-Only Pulse OS Experience
// app/experiences/voice-os/page.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createVoiceSession, generateVoiceBriefing, briefingToNarrative } from "@/lib/voice-os/session-manager";
import { generateAudioCue, audioCues } from "@/lib/voice-os/audio-cues";
import { VoiceSession } from "@/lib/voice-os/types";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VoiceOSPage() {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [briefing, setBriefing] = useState<string>("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    initializeSession();
  }, []);

  async function initializeSession() {
    // Get userId from auth
    const userId = "user_123"; // Would get from auth
    const newSession = await createVoiceSession(userId);
    setSession(newSession);

    // Generate and play briefing
    const briefingData = await generateVoiceBriefing(userId);
    const narrative = briefingToNarrative(briefingData, "warm_advisor");
    setBriefing(narrative);
    await speakText(narrative);
  }

  async function speakText(text: string) {
    setIsSpeaking(true);
    generateAudioCue(audioCues.ready);

    // Use Web Speech API
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onend = () => {
      setIsSpeaking(false);
      setSession((s) => (s ? { ...s, state: "listening" } : null));
    };

    speechSynthesis.speak(utterance);
  }

  function startListening() {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Speech recognition not supported in this browser");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      generateAudioCue(audioCues.ready);
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join("");
      setTranscript(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (transcript) {
        handleUserInput(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
      generateAudioCue(audioCues.error);
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  function stopListening() {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }

  async function handleUserInput(input: string) {
    if (!session) return;

    setSession((s) => (s ? { ...s, state: "processing" } : null));
    generateAudioCue(audioCues.thinking);

    // Process input (would integrate with Cortex)
    // For now, simple response
    const response = `I heard: "${input}". Let me help you with that.`;

    await speakText(response);
    setTranscript("");
  }

  return (
    <div className="min-h-screen bg-surface1 flex items-center justify-center p-6">
      <div className="max-w-2xl w-full space-y-8">
        {/* Status Display */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-2xl font-semibold text-text-primary mb-2">
            Voice-Only Pulse OS
          </div>
          <div className="text-sm text-text-secondary">
            {session?.state === "greeting" && "Initializing..."}
            {session?.state === "briefing" && "Briefing..."}
            {session?.state === "listening" && "Listening..."}
            {session?.state === "processing" && "Processing..."}
            {session?.state === "responding" && "Responding..."}
            {session?.state === "closing" && "Closing..."}
          </div>
        </motion.div>

        {/* Briefing Display */}
        {briefing && (
          <motion.div
            className="p-6 bg-surface2 rounded-lg border border-border-default"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="text-sm text-text-primary whitespace-pre-line">{briefing}</div>
          </motion.div>
        )}

        {/* Transcript */}
        {transcript && (
          <motion.div
            className="p-4 bg-surface3 rounded-lg border border-border-default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="text-sm text-text-secondary">You said:</div>
            <div className="text-sm text-text-primary mt-1">{transcript}</div>
          </motion.div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={isListening ? stopListening : startListening}
            disabled={isSpeaking}
            className="w-20 h-20 rounded-full"
          >
            {isListening ? (
              <MicOff className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>
        </div>

        {/* Visual Indicator */}
        <motion.div
          className="flex items-center justify-center"
          animate={{
            scale: isListening ? [1, 1.2, 1] : 1,
            opacity: isListening ? [0.5, 1, 0.5] : 0.3,
          }}
          transition={{
            duration: 1.5,
            repeat: isListening ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          <div className="w-32 h-32 rounded-full border-4 border-accent-cyan" />
        </motion.div>
      </div>
    </div>
  );
}



