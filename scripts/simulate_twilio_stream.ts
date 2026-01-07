
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    console.log('✅ Connected to Pulse Real-Time Server');

    // 1. Send 'start' event (Handshake)
    const startEvent = {
        event: "start",
        sequenceNumber: "1",
        start: {
            streamSid: "MZ1234567890",
            accountSid: "AC123",
            callSid: "CA123",
            tracks: ["inbound"],
            mediaFormat: { encoding: "audio/x-mulaw", sampleRate: 8000 }
        },
        streamSid: "MZ1234567890"
    };
    ws.send(JSON.stringify(startEvent));
    console.log("📤 Sent 'start' event");

    // 2. Send 'media' events (Audio Chunks)
    let count = 0;
    const interval = setInterval(() => {
        if (count >= 5) {
            clearInterval(interval);
            // 3. Send 'stop' event
            const stopEvent = {
                event: "stop",
                sequenceNumber: (count + 2).toString(),
                streamSid: "MZ1234567890",
                stop: { accountSid: "AC123", callSid: "CA123" }
            };
            ws.send(JSON.stringify(stopEvent));
            console.log("📤 Sent 'stop' event");
            ws.close();
            return;
        }

        const mediaEvent = {
            event: "media",
            sequenceNumber: (count + 2).toString(),
            media: {
                track: "inbound",
                chunk: count.toString(),
                timestamp: Date.now().toString(),
                payload: "BASE64_AUDIO_PAYLOAD_SIMULATION"
            },
            streamSid: "MZ1234567890"
        };
        ws.send(JSON.stringify(mediaEvent));
        console.log(`📤 Sent 'media' chunk ${count + 1}`);
        count++;
    }, 100);
});

ws.on('close', () => {
    console.log('👋 Connection closed');
});

ws.on('error', (err) => {
    console.error('❌ WebSocket Error:', err.message);
    console.log('NOTE: Ensure scripts/pulse_realtime_server.ts is running.');
});
