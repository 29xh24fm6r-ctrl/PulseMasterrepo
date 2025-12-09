import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const SECOND_BRAIN_DB = process.env.NOTION_DATABASE_SECOND_BRAIN;

interface PersonResult {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  type?: string;
  lastContact?: string;
  relationshipStatus?: string;
  notes?: string;
  rawData?: string;
  winProbability?: number;
}

/**
 * GET - Get all contacts or search by name
 * Query params: ?q=name (optional - if empty, returns all)
 */
export async function GET(request: NextRequest) {
  try {
    if (!SECOND_BRAIN_DB) {
      return NextResponse.json({
        ok: false,
        error: "Second Brain database not configured",
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q')?.trim() || '';
    
    // Build filter - if query provided, search by name/company
    let filter: any = undefined;
    if (query.length >= 1) {
      filter = {
        or: [
          { property: 'Name', title: { contains: query } },
          { property: 'Company', rich_text: { contains: query } },
        ],
      };
    }
    
    const response = await notion.databases.query({
      database_id: SECOND_BRAIN_DB.replace(/-/g, ''),
      filter,
      page_size: 50,
      sorts: [{ property: 'Name', direction: 'ascending' }],
    });
    
    const people: PersonResult[] = response.results.map((page: any) => extractPersonData(page));
    
    return NextResponse.json({
      ok: true,
      people,
      count: people.length,
    });
    
  } catch (error: any) {
    console.error("Person lookup error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

function extractPersonData(page: any): PersonResult {
  const props = page.properties || {};
  const today = new Date();
  
  const name = props.Name?.title?.[0]?.plain_text || 
               props.Title?.title?.[0]?.plain_text || 'Unknown';
  const company = props.Company?.rich_text?.[0]?.plain_text || 
                  props.Company?.select?.name || '';
  const email = props.Email?.email || 
                props.Email?.rich_text?.[0]?.plain_text || '';
  const phone = props.Phone?.phone_number || 
                props.Phone?.rich_text?.[0]?.plain_text || '';
  const type = props.Type?.select?.name || '';
  const lastContact = props['Last Contact']?.date?.start || null;
  
  let relationshipStatus = 'unknown';
  if (lastContact) {
    const lastDate = new Date(lastContact);
    const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince <= 7) relationshipStatus = 'hot';
    else if (daysSince <= 14) relationshipStatus = 'warm';
    else if (daysSince <= 30) relationshipStatus = 'cooling';
    else relationshipStatus = 'cold';
  }
  
  const notes = props.Notes?.rich_text?.[0]?.plain_text || '';
  const rawData = props['Raw Data']?.rich_text?.[0]?.plain_text || 
                  props['AI Analysis']?.rich_text?.[0]?.plain_text || '';
  const winProbability = props['Win Probability']?.number || undefined;
  
  return {
    id: page.id,
    name,
    company,
    email,
    phone,
    type,
    lastContact,
    relationshipStatus,
    notes,
    rawData,
    winProbability,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { personId } = await request.json();
    if (!personId) {
      return NextResponse.json({ ok: false, error: "personId required" }, { status: 400 });
    }
    
    const page = await notion.pages.retrieve({ page_id: personId }) as any;
    const person = extractPersonData(page);
    
    return NextResponse.json({ ok: true, person });
  } catch (error: any) {
    console.error("Person detail error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
