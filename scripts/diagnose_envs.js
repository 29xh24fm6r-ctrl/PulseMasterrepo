const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

function checkFile(filePath, label) {
    console.log(`\n--- Checking ${label} ---`);
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}`);
        return;
    }
    const config = dotenv.parse(fs.readFileSync(filePath));
    const keys = Object.keys(config);

    const required = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_FROM_NUMBER',
        'PULSE_VOICE_STREAM_WSS_URL'
    ];

    required.forEach(req => {
        if (keys.includes(req)) {
            const val = config[req];
            const status = val && val.length > 5 ? '✅ Present' : '⚠️ Empty/Short';
            console.log(`${req}: ${status}`);
        } else {
            console.log(`${req}: ❌ MISSING`);
        }
    });
}

function checkGateway(filePath, label) {
    console.log(`\n--- Checking ${label} ---`);
    if (!fs.existsSync(filePath)) {
        console.log(`❌ File not found: ${filePath}`);
        return;
    }
    const config = dotenv.parse(fs.readFileSync(filePath));
    const keys = Object.keys(config);

    const required = [
        'SUPABASE_URL',
        'SUPABASE_SERVICE_ROLE_KEY',
        'PULSE_VOICE_PUBLIC_BASE_URL',
        'LLM_PROVIDER'
    ];

    required.forEach(req => {
        if (keys.includes(req)) {
            const val = config[req];
            const status = val && val.length > 1 ? '✅ Present' : '⚠️ Empty/Short';
            console.log(`${req}: ${status}`);
        } else {
            console.log(`${req}: ❌ MISSING`);
        }
    });
}

checkFile('.env.local', 'Root .env.local');
checkGateway('services/voice-gateway/.env.local', 'Gateway .env.local');
