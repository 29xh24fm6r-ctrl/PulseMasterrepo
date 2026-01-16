import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// const openai = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { query, contacts } = await req.json();
    if (!query) return NextResponse.json({ error: "Query required" }, { status: 400 });

    const contactsList = (contacts || []).map((c: any) =>
      `- ${c.name}${c.company ? ` (${c.company})` : ""}${c.relationship ? ` [${c.relationship}]` : ""}${c.lastContact ? ` Last: ${c.lastContact}` : ""}`
    ).join("\n");

    const prompt = `You are Oracle, an AI that helps manage relationships. Answer based on this contact database:

CONTACTS:
${contactsList || "No contacts yet"}

QUESTION: ${query}

Be helpful and concise.`;

    const openai = new OpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || "I couldn't process that.";
    return NextResponse.json({ ok: true, response });
  } catch (err: any) {
    console.error("Oracle ask error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}