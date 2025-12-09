import { NextRequest, NextResponse } from "next/server";
import { Client } from "@notionhq/client";
import { JobModel, JobSelectionResult, createJobModelFromSelection, updateJobModel } from "@/lib/career/job-model";

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_JOB_MODEL || '';

// In-memory cache (primary storage - Notion is backup)
let cachedJobModel: JobModel | null = null;
let cacheTimestamp = 0;
const CACHE_TTL = 60000; // 60 seconds

/**
 * GET - Load current job model
 */
export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (cachedJobModel && Date.now() - cacheTimestamp < CACHE_TTL) {
      return NextResponse.json({ ok: true, jobModel: cachedJobModel });
    }
    
    // Try to load from Notion
    if (DATABASE_ID) {
      try {
        const response = await notion.databases.query({
          database_id: DATABASE_ID,
          page_size: 1,
          sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
        });
        
        if (response.results.length > 0) {
          const page = response.results[0] as any;
          const jobModel = parseJobModelFromNotion(page);
          if (jobModel) {
            cachedJobModel = jobModel;
            cacheTimestamp = Date.now();
            return NextResponse.json({ ok: true, jobModel });
          }
        }
      } catch (notionError) {
        console.warn('Notion load failed, using cache:', notionError);
      }
    }
    
    // Return cached or null
    return NextResponse.json({ ok: true, jobModel: cachedJobModel });
    
  } catch (error: any) {
    console.error('Get job model error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST - Save or update job model
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, selection, updates } = body;
    
    if (action === 'intake_complete') {
      return handleIntakeComplete(selection);
    }
    
    if (action === 'update') {
      return handleUpdate(updates);
    }
    
    if (action === 'reset') {
      return handleReset();
    }
    
    return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Job model error:', error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

async function handleIntakeComplete(selection: JobSelectionResult) {
  const jobModel = createJobModelFromSelection(selection);
  
  // Always update cache first (primary storage)
  cachedJobModel = jobModel;
  cacheTimestamp = Date.now();
  
  // Try to save to Notion (backup storage)
  if (DATABASE_ID) {
    try {
      await saveToNotion(jobModel);
      console.log(`✅ Job Model saved to Notion: ${jobModel.fullTitle}`);
    } catch (notionError: any) {
      console.warn('Notion save failed (using memory cache):', notionError.message);
    }
  }
  
  console.log(`✅ Job Model created: ${jobModel.fullTitle} (${jobModel.industryName})`);
  return NextResponse.json({ ok: true, jobModel });
}

async function handleUpdate(updates: Partial<JobModel>) {
  if (!cachedJobModel) {
    return NextResponse.json({ ok: false, error: 'No job model to update' }, { status: 400 });
  }
  
  const updatedModel = updateJobModel(cachedJobModel, updates);
  
  // Update cache
  cachedJobModel = updatedModel;
  cacheTimestamp = Date.now();
  
  // Try to update in Notion
  if (DATABASE_ID) {
    try {
      await saveToNotion(updatedModel);
    } catch (notionError: any) {
      console.warn('Notion update failed:', notionError.message);
    }
  }
  
  return NextResponse.json({ ok: true, jobModel: updatedModel });
}

async function handleReset() {
  // Clear cache
  cachedJobModel = null;
  cacheTimestamp = 0;
  
  // Try to archive in Notion
  if (DATABASE_ID) {
    try {
      const existing = await notion.databases.query({
        database_id: DATABASE_ID,
        page_size: 10,
      });
      
      for (const page of existing.results) {
        await notion.pages.update({
          page_id: page.id,
          archived: true,
        });
      }
    } catch (notionError: any) {
      console.warn('Notion archive failed:', notionError.message);
    }
  }
  
  return NextResponse.json({ ok: true });
}

/**
 * Save to Notion with flexible property handling
 */
async function saveToNotion(jobModel: JobModel) {
  // First, get database schema to see what properties exist
  const dbInfo = await notion.databases.retrieve({ database_id: DATABASE_ID });
  const existingProps = Object.keys((dbInfo as any).properties || {});
  
  // Build properties based on what exists
  const properties: any = {};
  
  // Find the title property
  const titleProp = Object.entries((dbInfo as any).properties || {}).find(
    ([_, v]: [string, any]) => v.type === 'title'
  );
  const titlePropName = titleProp ? titleProp[0] : 'Name';
  
  properties[titlePropName] = { 
    title: [{ text: { content: jobModel.fullTitle } }] 
  };
  
  // Store everything as JSON in a single text property if possible
  const dataProps = ['Data', 'Job Data', 'Profile', 'Content', 'Notes'];
  const dataProp = existingProps.find(p => dataProps.includes(p));
  
  if (dataProp) {
    const jsonData = JSON.stringify(jobModel);
    // Notion rich_text max is 2000 chars per block
    if (jsonData.length <= 2000) {
      properties[dataProp] = {
        rich_text: [{ text: { content: jsonData } }]
      };
    }
  }
  
  // Try to set individual properties if they exist (with correct types)
  const propTypes: Record<string, string> = {};
  for (const [name, prop] of Object.entries((dbInfo as any).properties || {})) {
    propTypes[name] = (prop as any).type;
  }
  
  // Helper to set property based on type
  const setProperty = (name: string, value: string) => {
    if (!existingProps.includes(name)) return;
    const type = propTypes[name];
    
    if (type === 'rich_text') {
      properties[name] = { rich_text: [{ text: { content: value } }] };
    } else if (type === 'select') {
      properties[name] = { select: { name: value } };
    } else if (type === 'title') {
      properties[name] = { title: [{ text: { content: value } }] };
    }
  };
  
  // Set standard properties
  setProperty('Company', jobModel.company || '');
  setProperty('Industry', jobModel.industryName);
  setProperty('Function', jobModel.functionName);
  setProperty('Seniority', jobModel.seniorityName);
  setProperty('Level', jobModel.seniorityName);
  setProperty('Employment', jobModel.employmentTypeName);
  setProperty('Skills', jobModel.coreSkills.join(', '));
  
  // Check for existing row
  const existing = await notion.databases.query({
    database_id: DATABASE_ID,
    page_size: 1,
  });
  
  if (existing.results.length > 0) {
    // Update existing
    await notion.pages.update({
      page_id: existing.results[0].id,
      properties,
    });
  } else {
    // Create new
    await notion.pages.create({
      parent: { database_id: DATABASE_ID },
      properties,
    });
  }
}

/**
 * Parse job model from Notion page
 */
function parseJobModelFromNotion(page: any): JobModel | null {
  const props = page.properties;
  
  // Try to find JSON data property first
  const dataProps = ['Data', 'Job Data', 'Profile', 'Content', 'Notes'];
  for (const propName of dataProps) {
    if (props[propName]?.rich_text?.[0]?.text?.content) {
      try {
        const data = JSON.parse(props[propName].rich_text[0].text.content);
        if (data.fullTitle) return data as JobModel;
      } catch (e) {
        // Not JSON, continue
      }
    }
  }
  
  // Fallback: try to reconstruct from individual properties
  const getText = (propNames: string[]): string => {
    for (const name of propNames) {
      if (props[name]?.title?.[0]?.text?.content) return props[name].title[0].text.content;
      if (props[name]?.rich_text?.[0]?.text?.content) return props[name].rich_text[0].text.content;
    }
    return '';
  };
  
  const getSelect = (propNames: string[]): string => {
    for (const name of propNames) {
      if (props[name]?.select?.name) return props[name].select.name;
    }
    return '';
  };
  
  const fullTitle = getText(['Name', 'Title', 'Full Title', 'Role']);
  if (!fullTitle) return null;
  
  // Return partial model - user will need to complete intake again for full data
  return {
    industryId: '',
    industryName: getText(['Industry']) || 'Unknown',
    functionId: '',
    functionName: getText(['Function']) || 'Unknown',
    roleId: '',
    roleName: fullTitle,
    seniorityId: '',
    seniorityName: getSelect(['Seniority', 'Level']) || 'Unknown',
    employmentTypeId: '',
    employmentTypeName: getSelect(['Employment', 'Employment Type']) || 'Full-Time',
    fullTitle,
    company: getText(['Company']) || undefined,
    typicalOutcomes: [],
    coreSkills: getText(['Skills'])?.split(',').map(s => s.trim()).filter(Boolean) || [],
    dailyActivities: [],
    customOutcomes: [],
    customSkills: [],
    customActivities: [],
    stakeholders: [],
    tools: [],
    constraints: [],
    confidenceScore: 0.5, // Lower confidence for reconstructed data
    dataSource: {
      intake: false,
      deepDive: false,
      secondBrain: false,
      userCorrections: 0,
    },
    createdAt: page.created_time,
    updatedAt: page.last_edited_time,
  };
}
