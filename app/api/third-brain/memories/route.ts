/**
 * Third Brain Memories API
 * POST /api/third-brain/memories - Create/update a memory
 * GET /api/third-brain/memories - Get memories
 * DELETE /api/third-brain/memories - Delete a memory
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import {
  upsertMemory,
  getMemory,
  getMemoriesByCategory,
  getTopMemories,
  deleteMemory,
} from "@/lib/third-brain/service";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { category, key, content, importance, metadata } = body;

    if (!category || !key || !content) {
      return NextResponse.json(
        { error: "category, key, and content are required" },
        { status: 400 }
      );
    }

    const memoryId = await upsertMemory({
      userId,
      category,
      key,
      content,
      importance,
      metadata,
    });

    if (!memoryId) {
      return NextResponse.json(
        { error: "Failed to save memory" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: memoryId });
  } catch (error) {
    console.error("[ThirdBrain Memories POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to save memory" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "30");

    // Get single memory by key
    if (key) {
      const memory = await getMemory(userId, key);
      if (!memory) {
        return NextResponse.json({ error: "Memory not found" }, { status: 404 });
      }
      return NextResponse.json(memory);
    }

    // Get memories by category
    if (category) {
      const memories = await getMemoriesByCategory(userId, category, limit);
      return NextResponse.json({
        memories,
        count: memories.length,
      });
    }

    // Get top memories (all categories)
    const memories = await getTopMemories(userId, limit);
    return NextResponse.json({
      memories,
      count: memories.length,
    });
  } catch (error) {
    console.error("[ThirdBrain Memories GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch memories" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const key = searchParams.get("key");

    if (!key) {
      return NextResponse.json(
        { error: "key parameter is required" },
        { status: 400 }
      );
    }

    const success = await deleteMemory(userId, key);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete memory" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[ThirdBrain Memories DELETE] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 500 }
    );
  }
}