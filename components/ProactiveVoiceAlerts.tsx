"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Volume2, VolumeX, Bell, X } from "lucide-react";

interface VoiceAlert {
  id: string;
  type: "reminder" | "insight" | "suggestion" | "urgent";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  spoken: boolean;
}

interface ProactiveVoiceAlertsProps {
  enabled?: boolean;
  checkInterval?: number; // ms
}

export function ProactiveVoiceAlerts({
  enabled = true,
  checkInterval = 60000, // Check every minute
}: ProactiveVoiceAlertsProps) {
  const [alerts, setAlerts] = useState<VoiceAlert[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(enabled);
  const [showPanel, setShowPanel] = useState(false);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const checkingRef = useRef(false);

  // Check for new alerts
  const checkForAlerts = useCallback(async () => {
    if (checkingRef.current || !voiceEnabled) return;
    checkingRef.current = true;

    try {
      const res = await fetch("/api/voice/alerts");
      if (!res.ok) return;

      const data = await res.json();
      const newAlerts: VoiceAlert[] = (data.alerts || []).map((a: any) => ({
        id: a.id,
        type: a.type || "reminder",
        title: a.title,
        message: a.message,
        timestamp: new Date(a.timestamp || Date.now()),
        read: false,
        spoken: false,
      }));

      // Add new alerts that we don't already have
      setAlerts((prev) => {
        const existingIds = new Set(prev.map((a) => a.id));
        const toAdd = newAlerts.filter((a) => !existingIds.has(a.id));
        return [...toAdd, ...prev].slice(0, 20); // Keep last 20
      });
    } catch (error) {
      console.error("[Voice Alerts] Check error:", error);
    } finally {
      checkingRef.current = false;
    }
  }, [voiceEnabled]);

  // Speak an alert
  const speakAlert = useCallback((alert: VoiceAlert) => {
    if (!("speechSynthesis" in window) || isSpeaking) return;

    const utterance = new SpeechSynthesisUtterance(
      `${alert.title}. ${alert.message}`
    );
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Try to use a natural voice
    const voices = speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.name.includes("Samantha") || v.name.includes("Google") || v.lang.startsWith("en")
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alert.id ? { ...a, spoken: true } : a))
      );
    };
    utterance.onerror = () => setIsSpeaking(false);

    speechRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [isSpeaking]);

  // Speak unspoken alerts
  useEffect(() => {
    if (!voiceEnabled || isSpeaking) return;

    const unspoken = alerts.find((a) => !a.spoken && !a.read);
    if (unspoken) {
      // Small delay before speaking
      const timeout = setTimeout(() => speakAlert(unspoken), 1000);
      return () => clearTimeout(timeout);
    }
  }, [alerts, voiceEnabled, isSpeaking, speakAlert]);

  // Check for alerts periodically
  useEffect(() => {
    if (!voiceEnabled) return;

    checkForAlerts();
    const interval = setInterval(checkForAlerts, checkInterval);
    return () => clearInterval(interval);
  }, [voiceEnabled, checkInterval, checkForAlerts]);

  // Stop speaking
  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Mark alert as read
  const markAsRead = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, read: true } : a))
    );
  };

  // Clear all alerts
  const clearAll = () => {
    setAlerts([]);
  };

  const unreadCount = alerts.filter((a) => !a.read).length;

  return (
    <>
      {/* Floating indicator */}
      <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-2">
        {/* Speaking indicator */}
        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="flex items-center gap-2 px-3 py-2 bg-purple-600 text-white rounded-full shadow-lg animate-pulse"
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-sm">Speaking...</span>
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Alert bell */}
        <button
          onClick={() => setShowPanel(!showPanel)}
          className="relative p-3 bg-zinc-800 border border-zinc-700 rounded-full shadow-lg hover:bg-zinc-700 transition"
        >
          <Bell className="w-5 h-5 text-zinc-300" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Alerts panel */}
      {showPanel && (
        <div className="fixed bottom-40 right-6 z-50 w-80 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <h3 className="font-medium text-white">Voice Alerts</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`p-1.5 rounded-lg transition ${
                  voiceEnabled ? "bg-purple-600" : "bg-zinc-700"
                }`}
                title={voiceEnabled ? "Disable voice" : "Enable voice"}
              >
                {voiceEnabled ? (
                  <Volume2 className="w-4 h-4 text-white" />
                ) : (
                  <VolumeX className="w-4 h-4 text-zinc-400" />
                )}
              </button>
              <button
                onClick={() => setShowPanel(false)}
                className="p-1.5 hover:bg-zinc-800 rounded-lg"
              >
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="p-4 text-center text-zinc-500 text-sm">
                No alerts yet
              </div>
            ) : (
              alerts.map((alert) => (
                <div
                  key={alert.id}
                  onClick={() => markAsRead(alert.id)}
                  className={`p-3 border-b border-zinc-800 cursor-pointer hover:bg-zinc-800/50 ${
                    alert.read ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {alert.title}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {alert.message}
                      </p>
                    </div>
                    {!alert.read && (
                      <span className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {alerts.length > 0 && (
            <div className="p-2 border-t border-zinc-800">
              <button
                onClick={clearAll}
                className="w-full text-xs text-zinc-500 hover:text-zinc-300 py-1"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
