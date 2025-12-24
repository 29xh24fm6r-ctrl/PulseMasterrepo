import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });

  return NextResponse.json({
    ok: true,
    ai_drafting_enabled: String(process.env.EMAIL_AI_DRAFTING_ENABLED || "false") === "true",
    real_send_enabled: String(process.env.EMAIL_REAL_SEND_ENABLED || "false") === "true",
  });
}

