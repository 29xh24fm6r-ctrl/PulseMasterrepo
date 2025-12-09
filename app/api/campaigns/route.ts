/**
 * Campaigns API
 * GET /api/campaigns - List campaigns & templates
 * POST /api/campaigns - Create campaign
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  getCampaigns,
  createCampaign,
  createCampaignFromTemplate,
  CAMPAIGN_TEMPLATES,
} from "@/lib/campaigns/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const mode = req.nextUrl.searchParams.get("mode");

    if (mode === "templates") {
      return NextResponse.json({ templates: CAMPAIGN_TEMPLATES });
    }

    const campaigns = await getCampaigns(userId);
    return NextResponse.json({ campaigns });
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

    let campaign;
    if (body.templateId) {
      campaign = await createCampaignFromTemplate(userId, body.templateId, body.name, body.description);
    } else {
      campaign = await createCampaign(userId, body);
    }

    if (!campaign) {
      return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }

    return NextResponse.json({ campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}