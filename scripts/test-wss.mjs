import WebSocket from 'ws';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load .env.local manually since we are running as a script
const envLocalPath = path.resolve(process.cwd(), '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envLocalPath));

const url = envConfig.PULSE_VOICE_STREAM_WSS_URL;

if (!url) {
    console.error("No PULSE_VOICE_STREAM_WSS_URL in .env.local");
    process.exit(1);
}

// Append dummy query params to satisfy the gateway check
const testUrl = `${url}?callSessionId=TEST_PROBE&callSid=TEST_SID`;

console.log(`Connecting to: ${testUrl}`);

const ws = new WebSocket(testUrl);

ws.on('open', () => {
    console.log('✅ SUCCESS: Connected to WebSocket!');
    ws.close();
    process.exit(0);
});

ws.on('error', (err) => {
    console.error('❌ FAILURE: Could not connect.', err.message);
    process.exit(1);
});
