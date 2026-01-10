
import { VertexAI } from '@google-cloud/vertex-ai';

async function testGemini() {
    const projectId = 'pulse-life-os-2a8c9';
    const location = 'us-central1';
    const modelId = 'gemini-1.5-flash-001';

    console.log(`Testing Gemini API for project: ${projectId}`);

    const vertexAI = new VertexAI({ project: projectId, location: location });
    const model = vertexAI.getGenerativeModel({ model: modelId });

    try {
        const result = await model.generateContent('Hello, are you online?');
        const response = result.response;
        console.log('Response:', response.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error('Error:', error);
    }
}

testGemini();
