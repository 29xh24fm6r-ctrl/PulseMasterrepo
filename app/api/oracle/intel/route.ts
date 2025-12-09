import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { auth } from "@clerk/nextjs/server";
import { supabaseAdmin } from "@/lib/supabase";

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { contactId, contact } = await req.json();
    if (!contact) return NextResponse.json({ error: "Contact required" }, { status: 400 });

    // Fetch interactions from Supabase if contactId provided
    let interactions = "";
    if (contactId) {
      try {
        const { data } = await supabaseAdmin
          .from("interactions")
          .select("*")
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (data && data.length > 0) {
          interactions = data.map(i => `${i.type}: ${i.summary || i.notes}`).join("\n");
        }
      } catch (e) { console.log("Could not fetch interactions:", e); }
    }

    const prompt = `Analyze this contact and provide actionable insights.

CONTACT: ${contact.name}
Email: ${contact.email || "N/A"} | Phone: ${contact.phone || "N/A"}
Company: ${contact.company || "N/A"} | Title: ${contact.title || "N/A"}
Relationship: ${contact.relationship || "N/A"} | Status: ${contact.status || "N/A"}
Last Contact: ${contact.lastContact || contact.last_contact || "N/A"}
Notes: ${contact.notes || "None"}
Recent Interactions: ${interactions || "None"}

Return JSON only:
{"summary":"2-3 sentences","relationshipHealth":"brief assessment","insights":["insight1","insight2"],"suggestedActions":["action1"],"talkingPoints":["point1","point2"],"nextBestAction":"single most important step"}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
    });

    const text = completion.choices[0]?.message?.content || "{}";
    let intel;
    try {
      const match = text.match(/\{[\s\S]*\}/);
      intel = match ? JSON.parse(match[0]) : { summary: "Could not generate", relationshipHealth: "Unknown", insights: [], suggestedActions: [], talkingPoints: [], nextBestAction: "Reach out" };
    } catch { intel = { summary: "Parse error", relationshipHealth: "Unknown", insights: [], suggestedActions: [], talkingPoints: [], nextBestAction: "Reach out" }; }

    return NextResponse.json({ ok: true, intel });
  } catch (err: any) {
    console.error("Intel error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
