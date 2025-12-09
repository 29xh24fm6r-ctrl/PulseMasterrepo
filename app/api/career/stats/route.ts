import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const CAREER_DB_ID = process.env.CAREER_COACH_DB_ID || "2be6557d6aaa802a8242ef45e37ae3a7";

export async function GET(request: NextRequest) {
  try {
    // Find user's career profile
    const response = await notion.databases.query({
      database_id: CAREER_DB_ID,
      page_size: 1,
    });

    if (response.results.length === 0) {
      return NextResponse.json({ 
        ok: true, 
        stats: { roleplaySessions: 0, questionsAsked: 0, skillLessons: 0 } 
      });
    }

    const page = response.results[0] as any;
    const jobModelJson = page.properties.JobModelJSON?.rich_text?.[0]?.plain_text;
    
    let stats = { roleplaySessions: 0, questionsAsked: 0, skillLessons: 0 };
    if (jobModelJson) {
      try {
        const jobModel = JSON.parse(jobModelJson);
        if (jobModel.usageStats) {
          stats = jobModel.usageStats;
        }
      } catch (e) {
        // Invalid JSON, use defaults
      }
    }

    return NextResponse.json({ ok: true, stats });
  } catch (error: any) {
    console.error('Stats GET error:', error);
    return NextResponse.json({ 
      ok: true, 
      stats: { roleplaySessions: 0, questionsAsked: 0, skillLessons: 0 } 
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body; // 'roleplay', 'question', 'lesson'

    // Find user's career profile
    const response = await notion.databases.query({
      database_id: CAREER_DB_ID,
      page_size: 1,
    });

    if (response.results.length === 0) {
      return NextResponse.json({ ok: false, error: 'No profile found' }, { status: 404 });
    }

    const page = response.results[0] as any;
    const pageId = page.id;
    const jobModelJson = page.properties.JobModelJSON?.rich_text?.[0]?.plain_text;
    
    let jobModel: any = {};
    if (jobModelJson) {
      try {
        jobModel = JSON.parse(jobModelJson);
      } catch (e) {
        // Invalid JSON
      }
    }

    // Initialize or update stats
    if (!jobModel.usageStats) {
      jobModel.usageStats = { roleplaySessions: 0, questionsAsked: 0, skillLessons: 0 };
    }

    // Increment the appropriate counter
    if (action === 'roleplay') {
      jobModel.usageStats.roleplaySessions = (jobModel.usageStats.roleplaySessions || 0) + 1;
    } else if (action === 'question') {
      jobModel.usageStats.questionsAsked = (jobModel.usageStats.questionsAsked || 0) + 1;
    } else if (action === 'lesson') {
      jobModel.usageStats.skillLessons = (jobModel.usageStats.skillLessons || 0) + 1;
    }
    
    jobModel.usageStats.lastActive = new Date().toISOString();

    // Update Notion - truncate if too long
    const jsonString = JSON.stringify(jobModel);
    const truncatedJson = jsonString.length > 2000 ? jsonString.substring(0, 2000) : jsonString;

    await notion.pages.update({
      page_id: pageId,
      properties: {
        JobModelJSON: {
          rich_text: [{ text: { content: truncatedJson } }],
        },
      },
    });

    return NextResponse.json({ ok: true, stats: jobModel.usageStats });
  } catch (error: any) {
    console.error('Stats POST error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
