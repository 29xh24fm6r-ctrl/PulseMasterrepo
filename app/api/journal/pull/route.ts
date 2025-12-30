import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { getJournalEntries } from "@/lib/data/journal";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const entries = await getJournalEntries(userId);

    // Map to expected format if UI expects .preview etc
    // Supabase returns full content, usually better than Notion blocks
    const formatted = entries.map(e => ({
      id: e.id,
      title: e.title,
      date: e.created_at.split('T')[0],
      mood: e.mood,
      tags: e.tags,
      preview: e.content.substring(0, 200),
      createdAt: e.created_at
    }));

    return NextResponse.json({ ok: true, entries: formatted, total: entries.length });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: 'Failed to fetch journals' }, { status: 500 });
  }
}
