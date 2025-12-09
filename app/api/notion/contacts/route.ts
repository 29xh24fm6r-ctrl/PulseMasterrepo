// app/api/notion/contacts/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;

export async function GET(request: NextRequest) {
  try {
    if (!SECOND_BRAIN_DB) {
      return NextResponse.json({ ok: false, error: 'SECOND_BRAIN_DB not configured' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const filter = searchParams.get('filter'); // 'recent', 'cold', 'all'

    const today = new Date();

    // Try to filter by Type=Person, but fall back if property doesn't exist
    let response;
    try {
      response = await notion.databases.query({
        database_id: SECOND_BRAIN_DB.replace(/-/g, ''),
        filter: {
          property: 'Type',
          select: { equals: 'Person' },
        },
        page_size: 100,
      });
    } catch {
      // If Type property doesn't exist, get all entries
      response = await notion.databases.query({
        database_id: SECOND_BRAIN_DB.replace(/-/g, ''),
        page_size: 100,
      });
    }

    let contacts = response.results.map((page: any) => {
      const props = page.properties || {};
      const name = props.Name?.title?.[0]?.plain_text || 'Unknown';
      const email = props.Email?.email || props.Email?.rich_text?.[0]?.plain_text || '';
      const company = props.Company?.rich_text?.[0]?.plain_text || 
                      props.Company?.select?.name || '';
      const phone = props.Phone?.phone_number || props.Phone?.rich_text?.[0]?.plain_text || '';
      const lastContact = props['Last Contact']?.date?.start || null;
      const type = props.Type?.select?.name || 'Contact';

      let daysSinceContact = 999;
      let relationshipStatus: 'cold' | 'cooling' | 'warm' | 'hot' = 'cold';

      if (lastContact) {
        const lastDate = new Date(lastContact);
        daysSinceContact = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceContact <= 7) relationshipStatus = 'hot';
        else if (daysSinceContact <= 14) relationshipStatus = 'warm';
        else if (daysSinceContact <= 30) relationshipStatus = 'cooling';
        else relationshipStatus = 'cold';
      }

      return {
        id: page.id,
        name,
        email,
        company,
        phone,
        type,
        lastContact,
        daysSinceContact,
        relationshipStatus,
      };
    });

    // Filter to only people/contacts (not companies, notes, etc.)
    contacts = contacts.filter(c => 
      c.type === 'Person' || 
      c.type === 'Contact' || 
      c.email || 
      c.phone
    );

    // Apply filter
    if (filter === 'recent') {
      contacts = contacts.filter(c => c.daysSinceContact <= 30);
      contacts.sort((a, b) => a.daysSinceContact - b.daysSinceContact);
    } else if (filter === 'cold') {
      contacts = contacts.filter(c => c.relationshipStatus === 'cold');
      contacts.sort((a, b) => b.daysSinceContact - a.daysSinceContact);
    } else {
      // Default: sort by most recent contact
      contacts.sort((a, b) => a.daysSinceContact - b.daysSinceContact);
    }

    // Apply limit
    contacts = contacts.slice(0, limit);

    return NextResponse.json({
      ok: true,
      contacts,
      results: contacts,
      count: contacts.length,
    });

  } catch (error: any) {
    console.error('Contacts API error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}