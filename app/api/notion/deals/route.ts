// app/api/notion/deals/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DEALS_DB = process.env.NOTION_DATABASE_DEALS;

export async function GET(request: NextRequest) {
  try {
    if (!DEALS_DB) {
      return NextResponse.json({ ok: false, error: 'DEALS_DB not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const filter = searchParams.get('filter'); // 'active', 'stale', 'all'

    const today = new Date();

    const response = await notion.databases.query({
      database_id: DEALS_DB.replace(/-/g, ''),
      page_size: 100,
    });

    let deals = response.results.map((page: any) => {
      const props = page.properties || {};
      const name = props.Name?.title?.[0]?.plain_text || 
                   props['Deal Name']?.title?.[0]?.plain_text || 
                   'Untitled';
      const stage = props.Stage?.select?.name || 
                    props.Stage?.status?.name || 
                    props.Status?.select?.name || 
                    'Unknown';
      const value = props.Value?.number || props.Amount?.number || 0;
      const probability = props.Probability?.number || 50;
      const company = props.Company?.rich_text?.[0]?.plain_text || '';
      
      const lastEdited = new Date(page.last_edited_time);
      const daysSinceUpdate = Math.floor((today.getTime() - lastEdited.getTime()) / (1000 * 60 * 60 * 24));

      return {
        id: page.id,
        name,
        title: name,
        stage,
        value,
        probability,
        company,
        daysSinceUpdate,
        isStale: daysSinceUpdate > 7,
        isClosed: stage === 'Closed Won' || stage === 'Closed Lost' || stage === 'Closed',
      };
    });

    // Filter out closed deals by default
    if (filter !== 'all') {
      deals = deals.filter(d => !d.isClosed);
    }

    // Filter stale deals
    if (filter === 'stale') {
      deals = deals.filter(d => d.isStale);
    }

    // Sort by value (highest first)
    deals.sort((a, b) => b.value - a.value);

    // Apply limit
    deals = deals.slice(0, limit);

    return NextResponse.json({
      ok: true,
      deals,
      results: deals,
      count: deals.length,
      totalValue: deals.reduce((sum, d) => sum + d.value, 0),
    });

  } catch (error: any) {
    console.error('Deals API error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}