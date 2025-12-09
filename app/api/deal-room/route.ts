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
    const { dealsText } = body as { dealsText?: string };

    const systemPrompt = `
You are the Pulse OS Deal Room Engine for a commercial banker.

You receive a rough text description of deals, pipeline notes, or bullet points.
Your job is to normalize this into a clean pipeline overview.

Return ONLY JSON in this exact format:

{
  "deals": [
    {
      "name": "Short deal name",
      "stage": "Lead | Qualified | Proposal | Underwriting | Approved | Closing | Post-Close",
      "probability": 0.0,
      "amount": "string with currency or approx amount if known, else \\"N/A\\"",
      "riskFlags": ["short bullet risks"],
      "nextStep": "most important concrete next action",
      "xpAction": "short XP-able action (call, email, schedule, doc, etc.)"
    }
  ],
  "summary": "1–3 sentence overview of pipeline health.",
  "priorities": ["Top 3 deals to move now with why."]
}

If the input is empty, invent 3 realistic example deals to illustrate output.
`;

    const userContent = dealsText && dealsText.trim().length > 0
      ? `Here are my current deals and notes:\n\n${dealsText}`
      : "No deals provided. Generate 3 realistic sample commercial banking deals as an example.";

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
    console.error("Deal-room error:", error);
    return NextResponse.json(
      { error: "Error analyzing deals", details: `${error}` },
      { status: 500 }
    );
  }
}
