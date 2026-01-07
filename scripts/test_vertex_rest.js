const { execSync } = require('child_process');
const https = require('https');

async function run() {
    const token = execSync('gcloud auth print-access-token').toString().trim();
    const projectId = "pulse-life-os-2a8c9";
    const location = "us-central1";
    const model = "gemini-1.5-flash-001";

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models`;

    console.log("Listing Models:", url);

    const options = {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    };

    const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log("Status:", res.statusCode);
            console.log("Body:", body);
        });
    });

    req.on('error', (e) => console.error(e));
    // req.write(data); // GET request has no body
    req.end();
}

run();
