
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import twilio from 'twilio';

dotenv.config({ path: '.env.local' });

async function autoConfig() {
    console.log("🚀 Starting Auto-Configuration...");

    // 1. Fetch Ngrok URL
    console.log("🔍 Fetching Ngrok URL...");
    let ngrokUrl = '';
    try {
        const response = await fetch('http://localhost:4040/api/tunnels');
        const data = await response.json();
        const tunnel = data.tunnels.find((t: any) => t.proto === 'https');
        if (!tunnel) throw new Error("No HTTPS tunnel found");
        ngrokUrl = tunnel.public_url;
        console.log(`✅ Found Tunnel: ${ngrokUrl}`);
    } catch (e) {
        console.error("❌ Failed to fetch Ngrok URL. Is 'npm run tunnel' running?");
        console.error(e);
        process.exit(1);
    }

    // 2. Update .env.local
    console.log("📝 Updating .env.local...");
    const envPath = path.resolve(process.cwd(), '.env.local');
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Replace or Append NGROK_URL
    if (envContent.includes('NGROK_URL=')) {
        envContent = envContent.replace(/NGROK_URL=.*/, `NGROK_URL=${ngrokUrl}`);
    } else {
        envContent += `\nNGROK_URL=${ngrokUrl}`;
    }

    // Replace or Append APP_BASE_URL
    if (envContent.includes('APP_BASE_URL=')) {
        envContent = envContent.replace(/APP_BASE_URL=.*/, `APP_BASE_URL=${ngrokUrl}`);
    } else {
        envContent += `\nAPP_BASE_URL=${ngrokUrl}`;
    }

    fs.writeFileSync(envPath, envContent);
    console.log("✅ .env.local updated");

    // 3. Update Twilio
    console.log("📞 Updating Twilio Webhooks...");
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const voiceNumber = process.env.TWILIO_VOICE_NUMBER;

    if (!accountSid || !authToken || !voiceNumber) {
        console.error("❌ Missing Twilio Credentials in .env.local");
        process.exit(1);
    }

    const client = twilio(accountSid, authToken);

    try {
        // Find the phone number SID
        const numbers = await client.incomingPhoneNumbers.list({ phoneNumber: voiceNumber });
        if (numbers.length === 0) {
            console.error(`❌ Could not find number ${voiceNumber} in Twilio account.`);
            process.exit(1);
        }
        const numberSid = numbers[0].sid;

        // Update URLs
        await client.incomingPhoneNumbers(numberSid).update({
            voiceUrl: `${ngrokUrl}/api/comm/call/inbound`,
            voiceMethod: 'POST',
            statusCallback: `${ngrokUrl}/api/comm/call/status`,
            statusCallbackMethod: 'POST',
            smsUrl: `${ngrokUrl}/api/sms/inbound`,
            smsMethod: 'POST'
        });
        console.log("✅ Twilio Webhooks Updated:");
        console.log(`   Voice: ${ngrokUrl}/api/comm/call/inbound`);
        console.log(`   Status: ${ngrokUrl}/api/comm/call/status`);
        console.log(`   SMS: ${ngrokUrl}/api/sms/inbound`);

    } catch (e) {
        console.error("❌ Failed to update Twilio:", e);
        process.exit(1);
    }

    console.log("\n🎉 Configuration Complete! Please restart Next.js and Cyrano.");
}

autoConfig();
