import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

const coachMapping: Record<string, string> = {
  deal: "/deal-coach",
  career: "/career-coach",
  roleplay: "/roleplay-coach",
  communication: "/roleplay-coach",
  motivation: "/motivation",
  motivational: "/motivation",
  confidant: "/confidant",
  wellness: "/wellness",
  executive: "/productivity",
  "executive function": "/productivity",
  financial: "/financial-coach",
  finance: "/financial-coach",
  money: "/financial-coach",
  philosophy: "/philosophy-dojo",
  dojo: "/philosophy-dojo",
  stoic: "/philosophy-dojo",
  samurai: "/philosophy-dojo"
};

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Query required" }, { status: 400 });
    }

    const lowerQuery = query.toLowerCase();

    // Simple keyword matching
    for (const [keyword, href] of Object.entries(coachMapping)) {
      if (lowerQuery.includes(keyword)) {
        return NextResponse.json({
          recommendedCoach: keyword,
          href,
          confidence: 0.8
        });
      }
    }

    // TODO: Use AI to analyze query and recommend best coach
    // For now, default to coaches corner
    return NextResponse.json({
      recommendedCoach: null,
      href: "/coaches",
      confidence: 0.3,
      message: "Could not determine specific coach. Please browse coaches."
    });
  } catch (error) {
    console.error("[Coach Router API]", error);
    return NextResponse.json(
      { error: "Failed to route coach" },
      { status: 500 }
    );
  }
}





