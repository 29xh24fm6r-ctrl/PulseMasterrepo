import { getOpenAI } from "@/services/ai/openai";
import { ChefVisionResultSchema, type ChefVisionResult } from "./types";

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`Missing ${name}`);
    return v;
}

export async function detectIngredientsFromImages(args: {
    location: "fridge" | "pantry";
    imagesBase64: string[]; // raw base64 (no data: prefix)
}): Promise<ChefVisionResult> {
    const apiKey = requireEnv("OPENAI_API_KEY");
    const model = process.env.OPENAI_VISION_MODEL || "gpt-4.0-mini"; // Using closest available or fallback

    const client = getOpenAI();

    // We ask for STRICT JSON only. We validate with Zod.
    const prompt = `
You are Pulse Chef Vision.
Goal: identify food/ingredient items visible in the images.

Return STRICT JSON only with this exact shape:
{
  "location": "fridge" | "pantry",
  "items": [
    { "name": string, "confidence": number(0..1), "freshness"?: number(0..1), "quantity_hint"?: string }
  ]
}

Rules:
- Only include food/ingredients (no appliances, containers unless clearly leftovers).
- Use common ingredient names (e.g. "eggs", "milk", "chicken breast", "spinach").
- If unsure, lower confidence.
- freshness: 1.0 = very fresh/new, 0.0 = likely expired/old/unknown. Omit if unknown.
- Deduplicate obvious repeats.
- Keep items under 200.
`;

    // OpenAI supports image inputs in the Responses API using input_image.
    const input = [
        {
            role: "user" as const,
            content: [
                { type: "text" as const, text: prompt },
                ...args.imagesBase64.map((b64) => ({
                    type: "image_url" as const,
                    image_url: { url: `data:image/jpeg;base64,${b64}` },
                })),
                { type: "text" as const, text: `location=${args.location}` },
            ],
        },
    ];

    // Using standard chat completion with json_object mode for better compliance
    const openai = getOpenAI();
    const resp = await openai.chat.completions.create({
        model,
        messages: input as any,
        max_tokens: 1000,
        response_format: { type: "json_object" }
    });

    const text = resp.choices[0].message.content?.trim();
    if (!text) throw new Error("Vision model returned empty output_text");

    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        // Common failure mode: model wraps JSON in prose. Force a hard error so we can fix prompt quickly.
        throw new Error(`Vision model did not return valid JSON. Got: ${text.slice(0, 500)}`);
    }

    const validated = ChefVisionResultSchema.parse(parsed);
    return validated;
}
