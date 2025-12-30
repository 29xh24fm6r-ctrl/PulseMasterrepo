import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createJournalEntry } from "@/lib/data/journal";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, type, sourceUrl, summary, keyInsights, actionableItems, quotes, tags, transcript, duration, relatedTo } = body;

    if (!title) {
      return NextResponse.json(
        { ok: false, error: "Missing title" },
        { status: 400 }
      );
    }

    console.log("💾 Saving to Journal (Knowledge Base)...");

    // Format content block for the journal entry
    let content = summary || "";

    if (keyInsights && keyInsights.length > 0) {
      content += `\n\n**Key Insights:**\n${keyInsights.map((i: string) => `• ${i}`).join("\n")}`;
    }

    if (actionableItems && actionableItems.length > 0) {
      content += `\n\n**Action Items:**\n${actionableItems.map((i: string) => `• ${i}`).join("\n")}`;
    }

    if (quotes && quotes.length > 0) {
      content += `\n\n**Quotes:**\n${quotes.map((q: string) => `> "${q}"`).join("\n\n")}`;
    }

    if (sourceUrl) {
      content += `\n\n**Source:** ${sourceUrl}`;
    }

    if (transcript) {
      content += `\n\n**Transcript:**\n${transcript.substring(0, 5000)}... (truncated)`;
    }

    if (relatedTo) {
      content += `\n\n*Related to: ${relatedTo}*`;
    }

    // Combine tags and type
    const allTags = [...(tags || [])];
    if (type) allTags.push(`type:${type}`);
    allTags.push("capture"); // Add a 'capture' tag to distinguish from daily reflections

    const entry = await createJournalEntry(userId, {
      title,
      content,
      tags: allTags,
      mood: "neutral" // Default
    });

    console.log("✅ Saved to Journal!");

    return NextResponse.json({
      ok: true,
      pageId: entry.id,
    });
  } catch (err: any) {
    console.error("Save to Supabase error:", err?.message ?? err);
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Failed to save capture",
      },
      { status: 500 }
    );
  }
}
