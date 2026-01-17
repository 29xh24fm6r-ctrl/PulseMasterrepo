import { useState, useRef, useCallback } from "react";
import { PulseContextFrame } from "@/lib/companion/contextBus";

export type QuickTalkState = "idle" | "listening" | "processing" | "success" | "error";

export interface QuickTalkTrace {
    state: QuickTalkState;
    lastTranscript: string | null;
    lastIntent: string | null;
    latencyMs: number | null;
    error: string | null;
}

interface UseQuickTalkProps {
    onTraceUpdate?: (trace: QuickTalkTrace) => void;
}

export function useQuickTalk({ onTraceUpdate }: UseQuickTalkProps = {}) {
    const [state, setState] = useState<QuickTalkState>("idle");
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const startTimeRef = useRef<number>(0);

    const updateTrace = useCallback((partial: Partial<QuickTalkTrace>) => {
        if (onTraceUpdate) {
            onTraceUpdate({
                state: "idle", // Default, overwritten by partial
                lastTranscript: null,
                lastIntent: null,
                latencyMs: null,
                error: null,
                ...partial
            } as QuickTalkTrace);
        }
    }, [onTraceUpdate]);

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);

            chunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            recorder.start();
            mediaRecorderRef.current = recorder;
            setState("listening");
            updateTrace({ state: "listening" });

        } catch (err: any) {
            console.error("Mic error:", err);
            setState("error");
            updateTrace({ state: "error", error: err.message });
        }
    }, [updateTrace]);

    const stopRecording = useCallback(async (contextFrame: PulseContextFrame | null) => {
        if (!mediaRecorderRef.current || state !== "listening") return;

        return new Promise<void>((resolve) => {
            const recorder = mediaRecorderRef.current!;

            recorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm" });

                // Cleanup tracks
                recorder.stream.getTracks().forEach(t => t.stop());
                mediaRecorderRef.current = null;

                // Upload
                setState("processing");
                startTimeRef.current = Date.now();
                updateTrace({ state: "processing" });

                try {
                    const formData = new FormData();
                    formData.append("audio", blob);
                    formData.append("context", JSON.stringify(contextFrame || {}));
                    formData.append("client_ts", Date.now().toString());

                    const res = await fetch("/api/voice/intake", {
                        method: "POST",
                        body: formData
                    });

                    if (!res.ok) throw new Error(`API ${res.status}`);

                    const data = await res.json();
                    const latency = Date.now() - startTimeRef.current;

                    setState("success");
                    updateTrace({
                        state: "success",
                        lastTranscript: data.transcript,
                        lastIntent: JSON.stringify(data.intent),
                        latencyMs: latency
                    });

                    // Reset to idle after short delay
                    setTimeout(() => setState("idle"), 2000);

                } catch (err: any) {
                    console.error("Upload error:", err);
                    setState("error");
                    updateTrace({ state: "error", error: err.message });
                }

                resolve();
            };

            recorder.stop();
        });

    }, [state, updateTrace]);

    const cancelRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            mediaRecorderRef.current = null;
        }
        setState("idle");
        updateTrace({ state: "idle" });
    }, [updateTrace]);

    return {
        state,
        startRecording,
        stopRecording,
        cancelRecording
    };
}
