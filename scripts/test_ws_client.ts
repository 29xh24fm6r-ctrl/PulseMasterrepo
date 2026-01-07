
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
    console.log('✅ Connected to Pulse Cyrano Server');

    // Simulate Twilio 'start' event
    ws.send(JSON.stringify({
        event: 'start',
        start: {
            streamSid: 'MZ12345',
            callSid: 'CA123456789'
        }
    }));

    // Simulate sending audio
    const mockAudio = Buffer.from('mock-audio-data').toString('base64');

    let chunkCount = 0;
    const interval = setInterval(() => {
        ws.send(JSON.stringify({
            event: 'media',
            media: { payload: mockAudio }
        }));
        chunkCount++;
        process.stdout.write(`\r🔊 Sent audio chunk ${chunkCount}`);

        if (chunkCount >= 5) {
            clearInterval(interval);
            ws.close();
            console.log('\nTest completed.');
        }
    }, 500);
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('📩 Received from Server:', msg);
});

ws.on('error', (err) => {
    console.error('❌ Connection Error:', err);
});
