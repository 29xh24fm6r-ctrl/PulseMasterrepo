/**
 * Single Campaign API
 * GET /api/campaigns/[id] - Get campaign with enrollments
 * POST /api/campaigns/[id] - Update status or enroll contact
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCampaign,
  getCampaignEnrollments,
  updateCampaignStatus,
  enrollInCampaign,
} from "@/lib/campaigns/engine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const campaign = await getCampaign(userId, id);

    if (!campaign) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const enrollments = await getCampaignEnrollments(userId, id);

    return NextResponse.json({ campaign, enrollments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    // Update status
    if (body.status) {
      const success = await updateCampaignStatus(userId, id, body.status);
      return NextResponse.json({ success });
    }

    // Enroll contact
    if (body.enroll) {
      const enrollment = await enrollInCampaign(userId, id, body.enroll);
      return NextResponse.json({ enrollment });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}