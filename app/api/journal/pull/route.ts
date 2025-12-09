import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const JOURNAL_DB = process.env.NOTION_DATABASE_JOURNAL || process.env.JOURNAL_DB;

export async function GET(request: NextRequest) {
  try {
    if (!JOURNAL_DB) {
      return NextResponse.json({ ok: true, entries: [], message: 'Journal database not configured' });
    }

    const { searchParams } = new URL(request.url);
    const mood = searchParams.get('mood') || '';
    const startDate = searchParams.get('startDate') || '';
    const endDate = searchParams.get('endDate') || '';
    const limit = parseInt(searchParams.get('limit') || '50');

    const filters: any[] = [];
    if (mood) filters.push({ property: 'Mood', select: { equals: mood } });
    if (startDate) filters.push({ property: 'Date', date: { on_or_after: startDate } });
    if (endDate) filters.push({ property: 'Date', date: { on_or_before: endDate } });

    const queryOptions: any = {
      database_id: JOURNAL_DB,
      sorts: [{ property: 'Date', direction: 'descending' }],
      page_size: Math.min(limit, 100),
    };

    if (filters.length > 0) {
      queryOptions.filter = filters.length === 1 ? filters[0] : { and: filters };
    }

    const response = await notion.databases.query(queryOptions);

    const entries = await Promise.all(
      response.results.map(async (page: any) => {
        const props = page.properties || {};
        const title = props.Name?.title?.[0]?.plain_text || props.Title?.title?.[0]?.plain_text || 'Untitled';
        const date = props.Date?.date?.start || page.created_time?.split('T')[0];
        const moodValue = props.Mood?.select?.name || null;
        const tags = props.Tags?.multi_select?.map((t: any) => t.name) || [];

        let preview = '';
        try {
          const blocks = await notion.blocks.children.list({ block_id: page.id, page_size: 1 });
          const firstBlock = blocks.results[0] as any;
          if (firstBlock?.paragraph?.rich_text) {
            preview = firstBlock.paragraph.rich_text.map((t: any) => t.plain_text).join('').substring(0, 200);
          }
        } catch {}

        return { id: page.id, title, date, mood: moodValue, tags, preview, createdAt: page.created_time };
      })
    );

    return NextResponse.json({ ok: true, entries, total: entries.length, hasMore: response.has_more });
  } catch (error: any) {
    console.error('Journal pull error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch journals' }, { status: 500 });
  }
}
