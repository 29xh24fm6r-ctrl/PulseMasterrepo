
import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { GeminiLiveClient } from '../lib/pulse/vertex-live.js';
import { supabaseAdmin } from '../lib/supabase/admin.js'; // Ensure .js extension for tsx/esm execution

dotenv.config({ path: '.env.local' });

const PORT = 8080;
const server = createServer();
const wss = new WebSocketServer({ server });

console.log(`🚀 Pulse Cyrano Server listening on port ${PORT}`);

wss.on('connection', (ws: WebSocket) => {
    console.log('Client connected');

    let streamSid: string | null = null;
    let callSid: string | null = null; // Store for this connection
    const gemini = new GeminiLiveClient();

    // Connect to AI
    gemini.connect(
        // On Audio (AI speaks)
        (audioData) => {
            if (streamSid) {
                const payload = {
                    event: 'media',
                    streamSid,
                    media: {
                        payload: audioData.toString('base64')
                    }
                };
                ws.send(JSON.stringify(payload));
            }
        },
        // On Text (AI thinks/transcribes)
        async (text) => {
            console.log("🤖 AI:", text);
            if (streamSid && callSid) {
                // 1. Broadcast to UI (Fastest)
                supabaseAdmin.channel('realtime-calls').send({
                    type: 'broadcast',
                    event: 'transcript',
                    payload: { streamSid, callSid, text }
                });

                // 2. Persist to DB via RPC
                await (supabaseAdmin as any).rpc('append_call_transcript', {
                    p_call_sid: callSid,
                    p_text: text
                });
            }
        }
    );

    ws.on('message', async (message: string) => {
        try {
            const data = JSON.parse(message);

            switch (data.event) {
                case 'start':
                    streamSid = data.start.streamSid;
                    callSid = data.start.callSid; // Capture Call SID
                    console.log(`Stream started: ${streamSid} for Call: ${callSid}`);

                    if (callSid) {
                        await (supabaseAdmin as any).from('calls')
                            .update({ status: 'in-progress', started_at: new Date().toISOString() })
                            .eq('twilio_call_sid', callSid);
                    }
                    break;

                case 'media':
                    if (data.media.payload) {
                        const audioBuffer = Buffer.from(data.media.payload, 'base64');
                        gemini.sendAudio(audioBuffer);
                    }
                    break;

                case 'stop':
                    console.log(`Stream stopped: ${streamSid}`);
                    // callSid might be in data.stop or we use our local variable
                    const stopCallSid = data.stop?.callSid || callSid;

                    if (stopCallSid) {
                        await (supabaseAdmin as any).from('calls')
                            .update({ status: 'completed', ended_at: new Date().toISOString() })
                            .eq('twilio_call_sid', stopCallSid);
                    }
                    break;
            }
        } catch (e) {
            console.error('Error parsing message:', e);
        }
    });

    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

server.listen(PORT);
