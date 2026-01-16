import { auth } from "@clerk/nextjs/server";
import { canMakeAICall } from "@/services/usage";
import { NextResponse } from "next/server";
import { getContacts } from "@/lib/data/journal";
import { generateSalesEmail } from "@/lib/ai/email-generator";
import OpenAI from "openai";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is not set");
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const usageCheck = await canMakeAICall(userId, "generate_email", 3);
    if (!usageCheck.allowed) return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });

    const body = await req.json();
    const { dealName, dealStage, dealAmount, purpose, personName: inputName } = body;

    if (!dealName) {
      return NextResponse.json(
        { ok: false, error: "Missing deal info" },
        { status: 400 }
      );
    }

    const result = await generateSalesEmail(userId, {
      dealName,
      dealStage,
      dealAmount,
      purpose,
      personName: inputName,
    });

    return NextResponse.json({
      ok: true,
      email: result,
    });
  } catch (err: any) {
    console.error("Email generation error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to generate email",
      },
      { status: 500 }
    );
  }
}
