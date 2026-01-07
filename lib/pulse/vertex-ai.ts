import { VertexAI, GenerativeModel, Part } from "@google-cloud/vertexai";

// Initialize Vertex AI
const project = "pulse-life-os-2a8c9"; // Back to ID (works if permissions are right)
const location = "us-central1";

const vertex_ai = new VertexAI({ project: project, location: location });

// Models
const MODEL_NAME = "gemini-1.5-flash-001"; // Restored to Flash

export class PulseVertexAI {
    private model: GenerativeModel;

    constructor() {
        console.log(`🔌 Initializing Vertex AI: Project=${project}, Location=${location}, Model=${MODEL_NAME}`);
        this.model = vertex_ai.getGenerativeModel({
            model: MODEL_NAME,
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.2,
                topP: 0.95,
            }
        });
    }

    /**
     * Analyzes an audio buffer directly using Gemini 1.5 Flash.
     */
    async analyzeAudio(audioBuffer: Buffer, mimeType: string, prompt: string): Promise<string> {
        try {
            const audioPart: Part = {
                inlineData: {
                    data: audioBuffer.toString("base64"),
                    mimeType: mimeType,
                },
            };

            const textPart: Part = {
                text: prompt,
            };

            const request = {
                contents: [{ role: "user", parts: [audioPart, textPart] }],
            };

            const result = await this.model.generateContent(request);
            const response = await result.response;
            return response.candidates?.[0].content.parts?.[0].text || "{}";

        } catch (error) {
            console.error("❌ Vertex AI Audio Analysis Failed:", error);
            throw error;
        }
    }

    /**
     * Standard text-based generation.
     */
    async generateText(prompt: string): Promise<string> {
        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            return response.candidates?.[0].content.parts?.[0].text || "";
        } catch (error) {
            console.error("❌ Vertex AI Text Generation Failed:", error);
            throw error;
        }
    }
}

export const pulseVertex = new PulseVertexAI();
