import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY environment variable." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { deal } = body as {
      deal?: {
        name: string;
        stage: string;
        probability: number;
        amount: string;
        riskFlags: string[];
        nextStep: string;
      };
    };

    if (!deal) {
      return NextResponse.json(
        { error: "Missing deal data in request body." },
        { status: 400 }
      );
    }

    const systemPrompt = `
You are the Pulse OS Deal Coach for a commercial banker.

You receive a single deal object with:
- name
- stage
- probability (0–1)
- amount (string)
- riskFlags (array of strings)
- nextStep (string)

Return ONLY JSON in this exact format:

{
  "headline": "Short one-line summary of this deal.",
  "strengths": ["bullet strength", "..."],
  "weaknesses": ["bullet weakness", "..."],
  "structureIdeas": ["loan structure idea", "..."],
  "closingPlan": ["step 1", "step 2", "step 3"],
  "emailPrompt": "One-paragraph suggested email or call script to move the deal forward.",
  "xpAction": "Short action the user can take right now that deserves XP."
}
`;

    const userContent = `
Deal to coach:

Name: ${deal.name}
Stage: ${deal.stage}
Probability: ${Math.round(deal.probability * 100)}%
Amount: ${deal.amount}
Next Step (current): ${deal.nextStep}
Risks: ${deal.riskFlags.join("; ") || "None explicitly listed"}
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        temperature: 0.4,
      }),
    });

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";

    const content = JSON.parse(
      raw.replace(/```json/i, "").replace(/```/g, "").trim()
    );

    return NextResponse.json(content);
  } catch (error) {
    console.error("Deal-coach error:", error);
    return NextResponse.json(
      { error: "Error coaching deal", details: `${error}` },
      { status: 500 }
    );
  }
}
