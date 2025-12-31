import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import OpenAI from 'openai';
import { createDeal } from "@/lib/data/deals";

// Keep OpenAI for enrichment
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
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
      dealInput,
      useAI = true
    } = await request.json();

    const company = companyName?.trim() || '';
    const title = dealName?.trim() || dealInput?.trim() || '';

    if (!company && !title) {
      return NextResponse.json({ error: 'Company name or deal name is required' }, { status: 400 });
    }

    const validStage: DealStage = (stage && stageDaysToClose.hasOwnProperty(stage))
      ? stage as DealStage
      : 'Prospecting';

    const dealData = {
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

    // 🤖 AI Enrichment (Preserved from original)
    if (useAI && company) {
      try {
        const searchResponse = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(company + ' company')}`,
          { headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY! } }
        );

        const searchData = await searchResponse.json();
        const topResults = searchData.web?.results?.slice(0, 5) || [];

        const aiPrompt = `Research and enrich deal.
Company: "${company}"
Deal: "${dealData.title}"
Search Results:
${topResults.map((r: any) => `Title: ${r.title}\nDesc: ${r.description}`).join('\n')}

Return JSON: { industry, companySize, suggestedValue, aiInsights }`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: aiPrompt }],
        });

        const aiResponse = completion.choices[0].message.content?.trim();
        if (aiResponse) {
          const parsed = JSON.parse(aiResponse);
          dealData.industry = parsed.industry || '';
          dealData.companySize = parsed.companySize || '';
          dealData.aiInsights = parsed.aiInsights || '';
          if (!dealData.value && parsed.suggestedValue) dealData.value = parsed.suggestedValue;
        }
      } catch (e) {
        console.error('AI research failed:', e);
      }
    }

    // Auto-calc close date
    if (!dealData.closeDate) {
      const daysToAdd = stageDaysToClose[dealData.stage];
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + daysToAdd);
      dealData.closeDate = closeDate.toISOString().split('T')[0];
    }

    if (!dealData.title || dealData.title === `${company} - New Opportunity`) {
      dealData.title = `${company} - ${dealData.industry || 'Opportunity'}`;
    }

    // Save to Supabase via Data Layer
    const newDeal = await createDeal(userId, {
      title: dealData.title,
      company: dealData.company,
      value: dealData.value,
      stage: dealData.stage,
      close_date: dealData.closeDate,
      source: dealData.source,
      notes: dealData.notes,
      industry: dealData.industry,
      company_size: dealData.companySize,
      contact_name: dealData.contactName,
      contact_email: dealData.source,
      ai_insights: dealData.aiInsights
    });

    return NextResponse.json({
      success: true,
      dealId: newDeal.id,
      deal: newDeal,
      aiEnhanced: useAI
    });

  } catch (error: any) {
    console.error('Deal creation error:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}