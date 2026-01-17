import { getOpenAI } from "@/services/ai/openai";
import fs from "fs";
import path from "path";
import { env } from "../lib/env.js";
import { downsampleBuffer, pcmToMuLaw } from "../lib/audioUtils.js";
import type { VoiceConfig } from "./voiceSettings.js";

export async function generateSpeechOpenAI(text: string): Promise<Buffer> {
    const apiKey = env("OPENAI_API_KEY");

    // Defaults
    const voiceId = "shimmer"; // voiceOpt is removed, so default to shimmer
    const speed = 1.1; // voiceOpt is removed, so default to 1.1

    // OpenAI TTS
    const url = "https://api.openai.com/v1/audio/speech";

    const res = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            model: "tts-1",
            input: text,
            voice: voiceId,
            response_format: "pcm",
            speed: speed
        })
    });

    if (!res.ok) {
        const body = await res.text();
        throw new Error(`OpenAI TTS Error: ${res.status} ${body}`);
    }

    const arrayBuffer = await res.arrayBuffer();
    const pcmBuffer = Buffer.from(arrayBuffer);

    // Transcode: PCM 24k -> PCM 8k (Int16)
    const downsampled = downsampleBuffer(pcmBuffer, 24000, 8000);

    // Encode: PCM 8k -> Mu-Law 8k
    const mulaw = pcmToMuLaw(downsampled);

    return mulaw;
}
