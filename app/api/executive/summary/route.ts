/**
 * Executive Summary API
 * GET /api/executive/summary - Get latest or specific summary
 * POST /api/executive/summary - Generate new summary
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getLatestExecutiveSummary,
  generateExecutiveSummary,
  getDomainKPIs,
  recomputeDomainKPIs,
} from "@/lib/executive/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");

    // If dates provided, get specific period KPIs
    if (startParam && endParam) {
      const start = new Date(startParam);
      const end = new Date(endParam);
      
      const kpis = await getDomainKPIs(userId, start, end);
      return NextResponse.json({ kpis });
    }

    // Otherwise get latest summary
    const summary = await getLatestExecutiveSummary(userId);
    return NextResponse.json({ summary });
  } catch (error: any) {
    console.error("[Executive Summary GET] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { startDate, endDate, recompute } = body;

    // Default to last 7 days
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Optionally recompute KPIs first
    if (recompute) {
      await recomputeDomainKPIs({ userId, startDate: start, endDate: end });
    }

    const summary = await generateExecutiveSummary(userId, { start, end });

    if (!summary) {
      return NextResponse.json(
        { error: "Failed to generate summary" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, summary });
  } catch (error: any) {
    console.error("[Executive Summary POST] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}