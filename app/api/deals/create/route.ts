import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
// app/api/deals/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import OpenAI from 'openai';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Define valid stages
type DealStage = 'Prospecting' | 'Qualification' | 'Proposal' | 'Negotiation' | 'Closed Won' | 'Closed Lost';

const stageDaysToClose: Record<DealStage, number> = {
  'Prospecting': 90,
  'Qualification': 60,
  'Proposal': 30,
  'Negotiation': 14,
  'Closed Won': 0,
  'Closed Lost': 0
};

export async function POST(request: NextRequest) {
  try {
    const { 
      companyName,
      contactName,
      contactEmail,
      dealName,
      estimatedValue,
      stage,
      expectedCloseDate,
      source,
      notes,
      dealInput, // Legacy support
      useAI = true 
    } = await request.json();

    // Support both new structured input and legacy single input
    const company = companyName?.trim() || '';
    const title = dealName?.trim() || dealInput?.trim() || '';

    if (!company && !title) {
      return NextResponse.json({ error: 'Company name or deal name is required' }, { status: 400 });
    }

    // Validate stage
    const validStage: DealStage = (stage && stageDaysToClose.hasOwnProperty(stage)) 
      ? stage as DealStage 
      : 'Prospecting';

    let dealData = {
      title: title || `${company} - New Opportunity`,
      company: company,
      contactName: contactName?.trim() || '',
      contactEmail: contactEmail?.trim() || '',
      value: estimatedValue || 0,
      stage: validStage,
      closeDate: expectedCloseDate || null as string | null,
      source: source?.trim() || '',
      notes: notes?.trim() || '',
      industry: '',
      companySize: '',
      aiInsights: ''
    };

    // 🤖 AI researches the company and enriches deal data
    if (useAI && company) {
      try {
        // Search for company information
        const searchResponse = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(company + ' company')}`,
          {
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!
            }
          }
        );

        const searchData = await searchResponse.json();
        const topResults = searchData.web?.results?.slice(0, 5) || [];

        // AI analyzes company and enriches deal
        const aiPrompt = `You are a sales intelligence assistant. Research this company and provide deal insights.

Company: "${company}"
Deal: "${dealData.title}"
${dealData.contactName ? `Contact: ${dealData.contactName}` : ''}
${dealData.value > 0 ? `Proposed Value: $${dealData.value}` : ''}
${dealData.notes ? `Notes: ${dealData.notes}` : ''}

Search Results:
${topResults.map((r: any) => `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}`).join('\n\n')}

Analyze and return JSON with:
- industry: The company's primary industry/sector
- companySize: Estimated size (Startup, Small Business, Mid-Market, Enterprise, or Unknown)
- suggestedValue: If the proposed value seems off for this company size/industry, suggest a more realistic value. Otherwise return the original value or 0 if none provided.
- aiInsights: 2-4 sentences of useful intelligence for this deal - company background, recent news, potential opportunities or challenges, talking points

IMPORTANT:
- Be accurate - only include info you found in search results
- For suggestedValue, consider company size and typical deal sizes in their industry
- Make aiInsights actionable for a salesperson

Return ONLY valid JSON, no markdown.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: aiPrompt }],
          temperature: 0.3,
        });

        const aiResponse = completion.choices[0].message.content?.trim();
        if (aiResponse) {
          try {
            const parsed = JSON.parse(aiResponse);
            dealData.industry = parsed.industry || '';
            dealData.companySize = parsed.companySize || '';
            dealData.aiInsights = parsed.aiInsights || '';
            
            // Use AI suggested value if user didn't provide one
            if (!dealData.value && parsed.suggestedValue) {
              dealData.value = parsed.suggestedValue;
            }
          } catch (e) {
            console.error('AI JSON parse failed:', e);
          }
        }
      } catch (e) {
        console.error('AI research failed:', e);
      }
    }

    // Calculate close date if not provided (based on stage)
    if (!dealData.closeDate) {
      const daysToAdd = stageDaysToClose[dealData.stage];
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + daysToAdd);
      dealData.closeDate = closeDate.toISOString().split('T')[0];
    }

    // Build the deal title if not provided
    if (!dealData.title || dealData.title === `${company} - New Opportunity`) {
      dealData.title = `${company} - ${dealData.industry || 'Opportunity'}`;
    }

    // Create in Notion
    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_DEALS! },
      properties: {
        'Name': { title: [{ text: { content: dealData.title } }] },
        'Company': { rich_text: [{ text: { content: dealData.company } }] },
        'Value': { number: dealData.value },
        'Stage': { select: { name: dealData.stage } },
        'Close Date': { date: { start: dealData.closeDate } },
        ...(dealData.industry && {
          'Industry': { select: { name: dealData.industry } }
        }),
        ...(dealData.source && {
          'Source': { select: { name: dealData.source } }
        })
      }
    });

    // Add detailed notes and AI insights to page content
    const pageBlocks: any[] = [];

    // Contact info section
    if (dealData.contactName || dealData.contactEmail) {
      pageBlocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '👤 Contact' } }]
        }
      });
      if (dealData.contactName) {
        pageBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: `Name: ${dealData.contactName}` } }]
          }
        });
      }
      if (dealData.contactEmail) {
        pageBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: `Email: ${dealData.contactEmail}` } }]
          }
        });
      }
    }

    // Company intel section
    if (dealData.companySize || dealData.aiInsights) {
      pageBlocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '🔮 AI Intelligence' } }]
        }
      });
      if (dealData.companySize) {
        pageBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: `Company Size: ${dealData.companySize}` } }]
          }
        });
      }
      if (dealData.aiInsights) {
        pageBlocks.push({
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: dealData.aiInsights } }]
          }
        });
      }
    }

    // Notes section
    if (dealData.notes) {
      pageBlocks.push({
        object: 'block',
        type: 'heading_2',
        heading_2: {
          rich_text: [{ type: 'text', text: { content: '📝 Notes' } }]
        }
      });
      pageBlocks.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: dealData.notes } }]
        }
      });
    }

    // Add blocks to page
    if (pageBlocks.length > 0) {
      try {
        await notion.blocks.children.append({
          block_id: response.id,
          children: pageBlocks
        });
      } catch (e) {
        console.error('Failed to add content to page:', e);
      }
    }

    return NextResponse.json({
      success: true,
      dealId: response.id,
      deal: dealData,
      aiEnhanced: useAI
    });

  } catch (error: any) {
    console.error('Deal creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create deal', details: error.message },
      { status: 500 }
    );
  }
}