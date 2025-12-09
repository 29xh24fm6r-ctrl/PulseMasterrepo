// API Route: POST /api/cognitive-mesh/context
// Build rich context for AI interactions

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { CognitiveMesh } from "@/lib/cognitive-mesh";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      query,
      entity_ids,
      include_recent = true,
      max_fragments = 15,
      generate_summary = true,
    } = body;

    // Build raw context
    const context = await CognitiveMesh.buildContext(userId, {
      query,
      entityIds: entity_ids,
      includeRecentFragments: include_recent,
    });

    // Limit fragments
    const limitedFragments = context.fragments.slice(0, max_fragments);

    // Generate AI summary if requested
    let aiSummary = null;
    if (generate_summary && (query || limitedFragments.length > 0)) {
      aiSummary = await generateContextSummary(
        query,
        limitedFragments,
        context.entities
      );
    }

    return NextResponse.json({
      fragments: limitedFragments,
      entities: context.entities,
      edges: context.edges,
      raw_summary: context.summary,
      ai_summary: aiSummary,
      stats: {
        fragment_count: limitedFragments.length,
        entity_count: context.entities.length,
        edge_count: context.edges.length,
      },
    });
  } catch (error: any) {
    console.error("[Context Build] Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function generateContextSummary(
  query: string | undefined,
  fragments: any[],
  entities: any[]
): Promise<string> {
  if (fragments.length === 0 && entities.length === 0) {
    return "No relevant context found.";
  }

  const fragmentText = fragments
    .map((f) => `[${f.fragment_type}] ${f.content}`)
    .join("\n");

  const entityText = entities
    .map((e) => `${e.entity_type}: ${e.name}${e.description ? ` - ${e.description}` : ""}`)
    .join("\n");

  const prompt = query
    ? `Given this query: "${query}"\n\nSummarize the relevant context:\n\nKnowledge:\n${fragmentText}\n\nEntities:\n${entityText}`
    : `Summarize this user context:\n\nKnowledge:\n${fragmentText}\n\nEntities:\n${entityText}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are a context summarizer. Provide a concise 2-4 sentence summary of the user's context that would help an AI assistant understand the situation. Focus on the most relevant and actionable information.",
      },
      { role: "user", content: prompt },
    ],
    max_tokens: 200,
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || "Unable to generate summary.";
}