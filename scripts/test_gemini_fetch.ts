
import { GoogleAuth } from 'google-auth-library';
import https from 'https';

async function testGeminiFetch() {
    const projectId = 'pulse-life-os-2a8c9';
    const location = 'us-central1';

    console.log(`Listing Gemini Models for project: ${projectId}`);

    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });

    try {
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        const accessToken = token.token;

        if (!accessToken) {
            throw new Error("Failed to get token");
        }
        console.log("Token received.");

        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models`;

        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(url, options, (res) => {
            console.log(`Status Code: ${res.statusCode}`);
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => console.log('Response Body:', body));
        });

        req.on('error', (e) => console.error(e));
        req.end();

    } catch (error) {
        console.error('Auth Error:', error);
    }
}

testGeminiFetch();
