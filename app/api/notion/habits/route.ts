// app/api/notion/habits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const HABITS_DB = process.env.NOTION_DATABASE_HABITS;

export async function GET(request: NextRequest) {
  try {
    if (!HABITS_DB) {
      return NextResponse.json({ ok: false, error: 'HABITS_DB not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const response = await notion.databases.query({
      database_id: HABITS_DB.replace(/-/g, ''),
      page_size: 100,
    });

    let habits = response.results.map((page: any) => {
      const props = page.properties || {};
      const name = props.Name?.title?.[0]?.plain_text || 'Untitled';
      const icon = props.Icon?.rich_text?.[0]?.plain_text || '✓';
      const streak = props.Streak?.number || props['Current Streak']?.number || 0;
      const lastCompleted = props['Last Completed']?.date?.start || null;
      const frequency = props.Frequency?.select?.name || 'Daily';
      const category = props.Category?.select?.name || '';

      const completedToday = lastCompleted === todayStr;

      return {
        id: page.id,
        name,
        title: name,
        icon,
        streak,
        lastCompleted,
        frequency,
        category,
        completedToday,
        streakAtRisk: streak >= 3 && !completedToday && today.getHours() >= 18,
      };
    });

    // Sort by streak (highest first), then by name
    habits.sort((a, b) => {
      if (b.streak !== a.streak) return b.streak - a.streak;
      return a.name.localeCompare(b.name);
    });

    // Apply limit
    habits = habits.slice(0, limit);

    return NextResponse.json({
      ok: true,
      habits,
      results: habits,
      count: habits.length,
    });

  } catch (error: any) {
    console.error('Habits API error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}