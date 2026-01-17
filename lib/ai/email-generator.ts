import { getContacts } from "@/lib/data/journal";
import { getOpenAI } from "@/services/ai/openai";

// Top-level openai removed

export interface GenerateEmailInput {
    dealName: string;
    dealStage?: string;
    dealAmount?: number;
    purpose?: string;
    personName?: string;
}

export interface GeneratedEmail {
    subject: string;
    body: string;
    reasoning: string;
    recipientName: string;
}

export async function generateSalesEmail(
    userId: string,
    input: GenerateEmailInput
): Promise<GeneratedEmail> {
    if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not set");
    }

    const { dealName, dealStage, dealAmount, purpose, personName: inputName } = input;

    // Search Second Brain (Supabase Contacts) for related people
    let personIntel = "";
    let personName = inputName || "there";

    try {
        const contacts = await getContacts(userId);

        // Fuzzy match logic - finding related contact
        const relatedPerson = contacts.find((c) => {
            const nameMatch = c.name?.toLowerCase().includes(dealName.toLowerCase());
            const companyMatch =
                c.company?.toLowerCase() &&
                dealName.toLowerCase().includes(c.company.toLowerCase());
            return nameMatch || companyMatch;
        });

        if (relatedPerson) {
            personName = relatedPerson.name;
            const context = relatedPerson.context || {};

            const communicationStyle = context.communicationStyle || "Unknown";
            const painPoints = Array.isArray(context.painPoints)
                ? context.painPoints.join(", ")
                : context.painPoints || "None detected";
            const goals = Array.isArray(context.goals)
                ? context.goals.join(", ")
                : context.goals || "None detected";
            const objections = Array.isArray(context.objectionHistory)
                ? context.objectionHistory.join(", ")
                : context.objectionHistory || "None";

            personIntel = `
            **PERSON INTELLIGENCE:**
            Name: ${personName}
            Communication Style: ${communicationStyle}
            Pain Points: ${painPoints}
            Goals: ${goals}
            Objections They've Raised: ${objections}
            `;
        }
    } catch (err) {
        console.error("Second Brain lookup error:", err);
    }

    const prompt = `You are an elite sales communication expert. Write a highly personalized, effective email.

**DEAL CONTEXT:**
- Deal: ${dealName}
- Stage: ${dealStage || "Unknown"}
- Amount: ${dealAmount ? `$${dealAmount.toLocaleString()}` : "Not specified"}
- Purpose: ${purpose || "Move deal forward"}

${personIntel ||
        "**No Second Brain intelligence available - write a professional, engaging email.**"
        }

**YOUR MISSION:**
Write an email that:
1. Matches THEIR communication style perfectly
2. Addresses THEIR specific pain points and concerns
3. References THEIR goals and motivations
4. Handles THEIR objections proactively
5. Proposes clear next steps

**FORMAT AS JSON:**
{
  "subject": "...",
  "body": "...",
  "reasoning": "2-3 sentences explaining why this approach will work for THEM"
}

Respond ONLY with valid JSON.`;

    const openai = await getOpenAI();
    const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
    });

    let emailText = completion.choices[0].message.content || "{}";
    emailText = emailText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();

    const email = JSON.parse(emailText);

    return {
        subject: email.subject,
        body: email.body,
        reasoning: email.reasoning,
        recipientName: personName,
    };
}
