/**
 * Memory API
 * GET /api/memory - Search/list memories
 * POST /api/memory - Store/manage memories
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  storeMemory,
  searchMemories,
  getMemoriesByType,
  getRecentMemories,
  updateMemoryImportance,
  deleteMemory,
  detectPatterns,
  getPatterns,
  buildContextForQuery,
  extractMemoriesFromConversation,
} from "@/lib/memory/engine";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = req.nextUrl.searchParams;
    const mode = params.get("mode");
    const query = params.get("q");
    const type = params.get("type");

    if (mode === "patterns") {
      const patterns = await getPatterns(userId);
      return NextResponse.json({ patterns });
    }

    if (mode === "context" && query) {
      const context = await buildContextForQuery(userId, query);
      return NextResponse.json(context);
    }

    if (query) {
      const memories = await searchMemories(userId, query, {
        types: type ? [type as any] : undefined,
      });
      return NextResponse.json({ memories });
    }

    if (type) {
      const memories = await getMemoriesByType(userId, type as any);
      return NextResponse.json({ memories });
    }

    const memories = await getRecentMemories(userId);
    return NextResponse.json({ memories });
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
    const { action } = body;

    if (action === "extract") {
      const count = await extractMemoriesFromConversation(userId, body.messages);
      return NextResponse.json({ extracted: count });
    }

    if (action === "detect-patterns") {
      const patterns = await detectPatterns(userId);
      return NextResponse.json({ patterns });
    }

    if (action === "update-importance") {
      const success = await updateMemoryImportance(userId, body.memoryId, body.importance);
      return NextResponse.json({ success });
    }

    if (action === "delete") {
      const success = await deleteMemory(userId, body.memoryId);
      return NextResponse.json({ success });
    }

    // Store new memory
    const memory = await storeMemory(userId, body);
    return NextResponse.json({ memory });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}