import WebSocket from 'ws';
import type { GoogleAuth } from 'google-auth-library';
import { isBuildPhase } from '@/lib/env/guard';

// Configuration
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || 'pulse-life-os-2a8c9';
const LOCATION = 'us-central1';
const MODEL = 'gemini-1.5-pro-001'; // Verify if this model supports BidiStreaming or if we need a specific 'live' endpoint
// Note: As of late 2024/2025 BidiStreaming is often via specific endpoint:
// wss://us-central1-aiplatform.googleapis.com/ws/google.cloud.aiplatform.v1beta1.LlmService/BidiGenerateContent

export class GeminiLiveClient {
    private ws: WebSocket | null = null;
    private auth: GoogleAuth | null = null;

    constructor() {
        // Auth is initialized lazily or in connect to be async/safe
    }

    async connect(onAudio: (data: Buffer) => void, onText: (text: string) => void) {
        if (isBuildPhase()) {
            throw new Error("[RUNTIME VIOLATION] GeminiLiveClient accessed during build phase");
        }

        console.log("🔌 Authenticating with Google Cloud...");

        // Dynamic import for runtime enclave
        const { createGoogleCloudPlatformAuth } = await import('@/lib/runtime/google.runtime');
        this.auth = createGoogleCloudPlatformAuth();

        const client = await this.auth.getClient();
        const accessToken = await client.getAccessToken();
        const token = accessToken.token;

        if (!token) {
            throw new Error("Failed to get Google Cloud Access Token");
        }

        const host = `${LOCATION}-aiplatform.googleapis.com`;
        const path = `/ws/google.cloud.aiplatform.v1beta1.LlmService/BidiGenerateContent`;
        const url = `wss://${host}${path}`;

        console.log(`🔗 Connecting to Gemini Live API: ${url}`);

        this.ws = new WebSocket(url, {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        this.ws.on('open', () => {
            console.log("✅ Main Connection Open");

            // 1. Send Setup Message
            const setupMessage = {
                setup: {
                    model: `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}`,
                    generation_config: {
                        response_modalities: ["AUDIO", "TEXT"]
                    }
                }
            };
            this.ws?.send(JSON.stringify(setupMessage));
            console.log("📤 Sent Setup Message");
        });

        this.ws.on('message', (data: Buffer) => {
            try {
                const response = JSON.parse(data.toString());

                // Handle ServerContent
                if (response.serverContent) {
                    if (response.serverContent.modelTurn) {
                        const parts = response.serverContent.modelTurn.parts;
                        for (const part of parts) {
                            if (part.text) {
                                onText(part.text);
                            }
                            if (part.inlineData && part.inlineData.mimeType.startsWith('audio/')) {
                                // Decode base64 audio
                                const audioChunk = Buffer.from(part.inlineData.data, 'base64');
                                onAudio(audioChunk);
                            }
                        }
                    }
                }

                // Handle Tool Calls (Future)
                if (response.toolCall) {
                    console.log("🛠️ Tool Call Requested:", response.toolCall);
                }

            } catch (e) {
                console.error("❌ Error parsing Gemini message:", e);
            }
        });

        this.ws.on('error', (err) => {
            console.error("❌ Gemini WebSocket Error:", err);
        });

        this.ws.on('close', () => {
            console.log("⚠️ Gemini Connection Closed");
        });
    }

    sendAudio(chunk: Buffer) {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        // Send RealtimeInput
        const msg = {
            clientContent: {
                turns: [{
                    role: "user",
                    parts: [{
                        inlineData: {
                            mimeType: "audio/pcm;rate=8000", // Twilio mulaw is 8k. Might need transcoding to PCM linear if Gemini demands it. Gemini usually accepts PCM. 
                            data: chunk.toString('base64')
                        }
                    }]
                }],
                turn_complete: false // Streaming
            }
        };
        // Optimization: Standard BidiStreaming input might just be specific wrapped JSON. 
        // For 'live' usually we send continuous chunks.
        // Let's assume standard clientContent wrapper for now.
        this.ws.send(JSON.stringify(msg));
    }
}
