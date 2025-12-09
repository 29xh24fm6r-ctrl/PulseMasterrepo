/**
 * Industry Packs API
 * GET /api/packs - List available/installed packs
 * POST /api/packs - Install/uninstall packs
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getAvailablePacks,
  getPackById,
  getUserPacks,
  installPack,
  uninstallPack,
  getPackRecommendations,
  getPackKPIs,
  getPackWorkflows,
} from "@/lib/packs/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const mode = params.get("mode");
    const packId = params.get("id");

    if (mode === "installed") {
      const packs = await getUserPacks(userId);
      return NextResponse.json({ packs });
    }

    if (mode === "recommendations") {
      const packs = await getPackRecommendations(userId);
      return NextResponse.json({ packs });
    }

    if (mode === "kpis") {
      const kpis = await getPackKPIs(userId);
      return NextResponse.json({ kpis });
    }

    if (mode === "workflows") {
      const workflows = await getPackWorkflows(userId);
      return NextResponse.json({ workflows });
    }

    if (packId) {
      const pack = getPackById(packId);
      return NextResponse.json({ pack });
    }

    const packs = getAvailablePacks();
    return NextResponse.json({ packs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { action, packId, customizations } = body;

    if (action === "install") {
      const userPack = await installPack(userId, packId, customizations);
      return NextResponse.json({ userPack });
    }

    if (action === "uninstall") {
      const success = await uninstallPack(userId, packId);
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
