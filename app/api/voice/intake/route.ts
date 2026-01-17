import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const audio = formData.get("audio") as Blob;
        const contextStr = formData.get("context") as string;

        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 800));

        // Parse context just to verify handling
        let context = {};
        try {
            context = JSON.parse(contextStr);
        } catch (e) {
            // ignore
        }

        // Mock Response
        return NextResponse.json({
            transcript: "[voice intake wired - ready for STT]",
            intent: {
                type: "UNKNOWN",
                payload: {
                    audio_size: audio.size,
                    context_keys: Object.keys(context)
                }
            },
            confidence: 0.99,
            debug: {
                latency_ms: 123,
                provider: "stub"
            }
        });

    } catch (err: any) {
        return NextResponse.json(
            { error: "Failed to process voice", details: err.message },
            { status: 500 }
        );
    }
}
