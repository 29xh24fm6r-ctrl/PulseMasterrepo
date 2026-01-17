import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { getOpenAI } from "@/services/ai/openai";
import { PulseCortex } from "@/lib/cortex";
import { createDeal } from "@/lib/data/deals";

// Keep OpenAI for enrichment


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

    // GOD MODE INTERCEPTOR: Wrap the entire flow
    return await PulseCortex.intercept(
      {
        type: "deal_created",
        // We construct payload dynamically inside the handler for efficiency, 
        // but for the Interceptor pattern, we want to capture the INTENT (request body)
        // and potentially the RESULT. 
        // However, PulseCortex.intercept runs ASYNC side effects.
        // We will pass the request body as initial payload, and let the Cortex
        // infer based on that.
        payload: { company, stage, userTitle: title },
        context: {
          userId,
          source: "api/deals/create",
          timestamp: new Date()
        }
      },
      async () => {
        // --- ORIGINAL LOGIC START ---

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

            const openai = await getOpenAI();
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
          contact_email: dealData.contactEmail,
          ai_insights: dealData.aiInsights
        });

        // HACK: Re-feed the Memory with the FULL deal data now that we have it
        // This allows the Cortex (which runs async) to see the final enriched deal
        // But since PulseCortex.intercept fired at the start, we might want to manually trigger a "deal_enriched" event here.
        // We will leave it as is for V1 (Cortex will see the intent, which is enough for drafting).
        // Actually, to make "Rule 1" work in `lib/cortex/index.ts`, we need to pass `deal.title`, `deal.value` etc.
        // But `intercept` takes the initial payload. 
        // We can manually trigger a "shadow work" event here if we want.
        // Let's modify the Interceptor call to trigger Shadow Work AFTER result? 
        // No, intercptor pattern is middleware.
        // We will stick to the plan: Cortex sees the Intent.
        // But wait, the Intent doesn't have the Enriched Data.
        // So the "Shadow Email" will be generic if we rely only on Intent.

        // BETTER APPROACH: Log a secondary event.
        PulseCortex.feedMemory({
          type: "deal_finalized",
          payload: newDeal,
          context: { userId, source: "api/deals/create/result", timestamp: new Date() }
        });

        // Also Trigger Shadow Work specifically on this finalized data
        PulseCortex.triggerShadowWork({
          type: "deal_created", // We masquerade this as the creation event for the logic
          payload: newDeal,
          context: { userId, source: "api/deals/create", timestamp: new Date() }
        });

        return NextResponse.json({
          success: true,
          dealId: newDeal.id,
          deal: newDeal,
          aiEnhanced: useAI
        });
      }
      // --- ORIGINAL LOGIC END ---
    );

  } catch (error: any) {
    console.error('Deal creation error:', error);
    return NextResponse.json({ error: 'Failed to create deal' }, { status: 500 });
  }
}