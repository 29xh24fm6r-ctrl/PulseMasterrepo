import { NextRequest, NextResponse } from 'next/server';
import { auth } from "@clerk/nextjs/server";
import { getOpenAI } from "@/lib/llm/client";
// import OpenAI from 'openai';
import { createContact } from "@/lib/data/journal";

// Keep OpenAI for enrichment
// Keep OpenAI for enrichment
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(request: NextRequest) {
  const openai = getOpenAI();
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const {
      firstName,
      lastName,
      company,
      email,
      phone,
      contactInput,
      useAI = true,
      autoResearch = true
    } = await request.json();

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
        const searchQuery = contactData.company
          ? `${fullName} ${contactData.company} LinkedIn`
          : `${fullName} LinkedIn`;

        const searchResponse = await fetch(
          `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(searchQuery)}`,
          { headers: { 'Accept': 'application/json', 'X-Subscription-Token': process.env.BRAVE_SEARCH_API_KEY! } }
        );

        const searchData = await searchResponse.json();
        const topResults = searchData.web?.results?.slice(0, 5) || [];

        const aiPrompt = `Extract contact info.
Person: "${fullName}"
Company: "${contactData.company}"

Search Results:
${topResults.map((r: any) => `Title: ${r.title}\nDesc: ${r.description}`).join('\n')}

Return JSON: { title, company, industry, notes, linkedInUrl }`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: aiPrompt }],
        });

        const aiResponse = completion.choices[0].message.content?.trim();
        if (aiResponse) {
          const parsed = JSON.parse(aiResponse);
          contactData = {
            ...contactData, ...parsed,
            // Preserve user inputs
            name: fullName,
            email: contactData.email || parsed.email || '',
            phone: contactData.phone || '',
            company: contactData.company || parsed.company || ''
          };
        }
      } catch (e) {
        console.error('AI research failed:', e);
      }
    }

    // Save to Supabase
    const contact = await createContact(userId, {
      name: contactData.name,
      email: contactData.email,
      phone: contactData.phone,
      company: contactData.company,
      title: contactData.title,
      industry: contactData.industry,
      relationship: contactData.relationship,
      notes: contactData.notes,
      linkedin_url: contactData.linkedInUrl,
    });

    return NextResponse.json({
      success: true,
      contactId: contact.id,
      contact: contactData,
      aiEnhanced: useAI && autoResearch
    });

  } catch (error: any) {
    console.error('Contact creation error:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}