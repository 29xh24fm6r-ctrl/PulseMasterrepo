import { NextResponse } from "next/server";
import { requireAdminClerkUserId } from "@/lib/auth/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminClerkUserId();
    return NextResponse.json({ ok: true, message: "Admin access granted" });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ ok: false, error: err?.message ?? "Error" }, { status: 500 });
  }
}
