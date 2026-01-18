// components/companion/useQuickTalk.ts
"use client";

import { useMemo, useRef, useState } from "react";

type QuickTalkState = "idle" | "listening" | "uploading" | "done" | "error";

export function useQuickTalk(args: { ownerUserId: string; context: any }) {
    const [state, setState] = useState<QuickTalkState>("idle");
    const [runId, setRunId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const canRecord = useMemo(() => typeof window !== "undefined" && !!navigator.mediaDevices, []);

    async function start() {
        setError(null);
        setRunId(null);

        // Reset internal state if we were done/error
        setState("idle");

        if (!canRecord) {
            setError("Audio recording not supported in this browser");
            setState("error");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mr = new MediaRecorder(stream);

            chunksRef.current = [];
            mr.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
            };

            mr.onstop = () => {
                stream.getTracks().forEach((t) => t.stop());
            };

            mediaRecorderRef.current = mr;
            mr.start();
            setState("listening");
        } catch (e: any) {
            setError("Microphone access failed");
            setState("error");
        }
    }

    async function stop() {
        const mr = mediaRecorderRef.current;
        if (!mr) return;

        if (state !== "listening") return;

        setState("uploading");

        // We need to wait for onstop to fire to get all chunks? 
        // Actually MediaRecorder usage usually requires waiting for the 'stop' event to ensure the final blob is ready.
        // I'll wrap this in a promise to be safe.

        return new Promise<void>((resolve) => {
            mr.onstop = async () => {
                // Stop tracks
                mr.stream.getTracks().forEach((t) => t.stop());
                mediaRecorderRef.current = null;

                const blob = new Blob(chunksRef.current, { type: "audio/webm" });

                const form = new FormData();
                form.append("audio", blob, "quicktalk.webm");
                form.append("context", JSON.stringify(args.context ?? {}));

                try {
                    const res = await fetch("/api/voice/quick-talk/start", {
                        method: "POST",
                        headers: {
                            "x-owner-user-id": args.ownerUserId,
                        },
                        body: form,
                    });

                    if (!res.ok) throw new Error("quick_talk_start_failed");
                    const json = await res.json();
                    setRunId(json.run_id ?? null);
                    setState("done");
                } catch (e: any) {
                    setError("Failed to start quick talk run");
                    setState("error");
                }
                resolve();
            };
            mr.stop();
        });
    }

    async function toggle() {
        if (state === "listening") return stop();
        return start();
    }

    return { state, runId, error, start, stop, toggle };
}
