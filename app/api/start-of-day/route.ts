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

    const systemPrompt = `
You are the Pulse OS Start-of-Day Engine.

Your job:
- Generate Today’s Focus 3
- Provide identity reminder
- Provide 2–3 XP opportunities
- Provide a simple energy suggestion
- Format everything in clean JSON

Return ONLY JSON in this format:

{
  "focus3": ["", "", ""],
  "identity": "",
  "xpSuggestions": ["", ""],
  "energy": "",
  "timestamp": ""
}
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
          { role: "user", content: "Generate my start of day packet." },
        ],
      }),
    });

    const data = await response.json();

    const content = JSON.parse(
      data.choices[0].message.content
        .replace(/```json/, "")
        .replace(/```/, "")
        .trim()
    );

    return NextResponse.json(content);
  } catch (error) {
    return NextResponse.json(
      { error: "Error generating Start-of-Day", details: `${error}` },
      { status: 500 }
    );
  }
}

