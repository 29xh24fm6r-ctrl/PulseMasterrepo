import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
// app/api/second-brain/create/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';
import OpenAI from 'openai';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const { 
      firstName, 
      lastName, 
      company, 
      email, 
      phone,
      contactInput, // Legacy support
      useAI = true, 
      autoResearch = true 
    } = await request.json();

    // Support both new structured input and legacy single input
    const fullName = firstName && lastName 
      ? `${firstName.trim()} ${lastName.trim()}`
      : contactInput?.trim() || '';

    if (!fullName) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    let contactData = {
      name: fullName,
      email: email?.trim() || '',
      phone: phone?.trim() || '',
      company: company?.trim() || '',
      title: '',
      industry: '',
      relationship: 'New Contact',
      notes: '',
      linkedInUrl: ''
    };

    // 🤖 AI researches contact automatically
    if (useAI && autoResearch) {
      try {
        // Build search query - use name + company for better results
        const searchQuery = contactData.company 
          ? `${fullName} ${contactData.company} LinkedIn`
          : `${fullName} LinkedIn`;

        const searchResponse = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}`,
          {
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY!
            }
          }
        );

        const searchData = await searchResponse.json();
        const topResults = searchData.web?.results?.slice(0, 5) || [];

        // AI extracts professional info
        const aiPrompt = `You are a professional contact research assistant. Based on the search results below, extract and enrich information about this person.

Person: "${fullName}"
${contactData.company ? `Company provided: ${contactData.company}` : ''}

Search Results:
${topResults.map((r: any) => `Title: ${r.title}\nDescription: ${r.description}\nURL: ${r.url}`).join('\n\n')}

Extract and return JSON with:
- title: Their current job title (if found)
- company: Their current company (use provided company if search doesn't find a different one)
- industry: Industry/sector they work in
- notes: 2-4 sentence professional summary about this person - their background, expertise, notable achievements
- linkedInUrl: LinkedIn profile URL if found in results

IMPORTANT: 
- If you can't find specific info, use empty string ""
- For notes, synthesize what you learned about them professionally
- Be accurate - don't make up information

Return ONLY valid JSON, no markdown or explanation.`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: aiPrompt }],
          temperature: 0.3,
        });

        const aiResponse = completion.choices[0].message.content?.trim();
        if (aiResponse) {
          try {
            const parsed = JSON.parse(aiResponse);
            // Merge AI data but keep user-provided email/phone
            contactData = { 
              ...contactData, 
              ...parsed,
              // Preserve user-provided data
              name: fullName,
              email: contactData.email || parsed.email || '',
              phone: contactData.phone || '',
              // Use AI company only if user didn't provide one
              company: contactData.company || parsed.company || ''
            };
          } catch (e) {
            console.error('AI JSON parse failed:', e);
          }
        }
      } catch (e) {
        console.error('AI research failed:', e);
      }
    }

    // Create in Notion
    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DATABASE_SECOND_BRAIN! },
      properties: {
        'Name': { title: [{ text: { content: contactData.name } }] },
        'Company': { rich_text: [{ text: { content: contactData.company } }] },
        'Title': { rich_text: [{ text: { content: contactData.title } }] },
        'Industry': { select: { name: contactData.industry || 'Unknown' } },
        'Relationship': { select: { name: contactData.relationship } },
        ...(contactData.email && {
          'Email': { email: contactData.email }
        }),
        ...(contactData.phone && {
          'Phone': { phone_number: contactData.phone }
        })
      }
    });

    // Add notes to page content if we have AI intel
    if (contactData.notes || contactData.linkedInUrl) {
      try {
        await notion.blocks.children.append({
          block_id: response.id,
          children: [
            {
              object: 'block',
              type: 'heading_2',
              heading_2: {
                rich_text: [{ type: 'text', text: { content: '🔮 AI Intelligence' } }]
              }
            },
            ...(contactData.notes ? [{
              object: 'block' as const,
              type: 'paragraph' as const,
              paragraph: {
                rich_text: [{ type: 'text' as const, text: { content: contactData.notes } }]
              }
            }] : []),
            ...(contactData.linkedInUrl ? [{
              object: 'block' as const,
              type: 'paragraph' as const,
              paragraph: {
                rich_text: [{ 
                  type: 'text' as const, 
                  text: { 
                    content: 'LinkedIn: ' + contactData.linkedInUrl,
                    link: { url: contactData.linkedInUrl }
                  } 
                }]
              }
            }] : [])
          ]
        });
      } catch (e) {
        console.error('Failed to add notes to page:', e);
      }
    }

    return NextResponse.json({
      success: true,
      contactId: response.id,
      contact: contactData,
      aiEnhanced: useAI && autoResearch
    });

  } catch (error: any) {
    console.error('Contact creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create contact', details: error.message },
      { status: 500 }
    );
  }
}