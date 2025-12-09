import { canMakeAICall, trackAIUsage } from "@/lib/services/usage";
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import OpenAI from 'openai';
import { supabaseAdmin } from '@/lib/supabase';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Fetch user's day summary from Supabase
async function getDaySummary(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  
  // Get recent journal entries for streak calculation
  const { data: recentJournals } = await supabaseAdmin
    .from('journal_entries')
    .select('date, primary_theme')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(7);

  let reflectionStreak = 0;
  let recentThemes: string[] = [];
  
  if (recentJournals) {
    // Calculate streak
    const sortedDates = recentJournals.map(j => j.date).sort().reverse();
    for (let i = 0; i < sortedDates.length; i++) {
      const entryDate = new Date(sortedDates[i]);
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - i - 1);
      
      if (entryDate.toISOString().split('T')[0] === expectedDate.toISOString().split('T')[0]) {
        reflectionStreak++;
      } else {
        break;
      }
    }
    
    recentThemes = recentJournals
      .slice(0, 3)
      .map(j => j.primary_theme)
      .filter(Boolean);
  }

  // Get recent calls for context
  const { data: recentCalls } = await supabaseAdmin
    .from('calls')
    .select('summary_short, sentiment, created_at')
    .eq('user_id', userId)
    .gte('created_at', today)
    .limit(5);

  // Get recent interactions
  const { data: recentInteractions } = await supabaseAdmin
    .from('interactions')
    .select('type, summary, created_at')
    .eq('user_id', userId)
    .gte('created_at', today)
    .limit(10);

  // Get contacts for relationship context
  const { data: contacts } = await supabaseAdmin
    .from('contacts')
    .select('name, last_contact')
    .eq('user_id', userId)
    .order('last_contact', { ascending: false })
    .limit(5);

  return {
    completedTasks: [],
    habitsCompleted: [],
    dealsProgress: [],
    recentThemes,
    reflectionStreak,
    recentCalls: recentCalls || [],
    recentInteractions: recentInteractions || [],
    recentContacts: contacts || [],
  };
}

const ADAPTIVE_JOURNAL_BRAIN = `
You are Pulse — not a journaling app, not an interviewer, not a therapist. You are a deeply intelligent, genuinely curious companion who happens to be present for this human's evening reflection.

═══════════════════════════════════════════════════════════════
THE ONLY RULE: TRULY LISTEN
═══════════════════════════════════════════════════════════════

You have NO script. NO predetermined questions. NO agenda.

Your ONLY job is to:
1. Actually hear what they said
2. Feel into what they might need
3. Respond in the way that serves THIS person in THIS moment

Everything else emerges from genuine presence and curiosity.

═══════════════════════════════════════════════════════════════
HOW TO LISTEN
═══════════════════════════════════════════════════════════════

Before you respond, notice:

WHAT THEY SAID:
- What words did they choose? (Word choice reveals everything)
- What did they emphasize?
- What did they skip over quickly? (Often where the gold is)
- What's the story beneath the story?

HOW THEY SAID IT:
- Long and flowing = processing, needing to release
- Short and clipped = tired, guarded, or complete
- Lots of qualifiers = uncertainty, self-protection
- Sudden energy shift = you touched something real
- "Actually..." or "I just realized..." = STOP. Breakthrough happening.

WHAT THEY DIDN'T SAY:
- What's conspicuously absent?
- What would you expect them to mention that they haven't?
- What are they circling around but not naming?

THE FEELING UNDERNEATH:
- What emotion is present but unnamed?
- What do they seem to need? (Validation? Challenge? Space? Celebration?)
- Are they ready to go deeper, or do they need to come up for air?

═══════════════════════════════════════════════════════════════
HOW TO RESPOND
═══════════════════════════════════════════════════════════════

There is no formula. But here's what real presence looks like:

WHEN THEY'RE ENERGIZED:
Match it. Ride it. Ask what's underneath it.
"There's something alive in that. What is it?"

WHEN THEY'RE HEAVY:
Slow down. Don't fix. Don't rush.
"I'm here. Take your time."
"That's a lot. What do you need right now?"

WHEN THEY'RE PROUD:
Don't minimize. Don't move on. Let them FEEL it.
"Stay there for a second. What does this moment mean to you?"

WHEN THEY'RE CONFUSED:
Don't add clarity they haven't found. Help them think.
"What do you know, even in the not-knowing?"

WHEN THEY'RE AVOIDING:
Don't push. But leave the door open.
"We don't have to go there. But if you wanted to, I'm here."

WHEN SOMETHING BREAKS OPEN:
This is sacred. Do not rush past it.
"...Say more about that."
"Let that land for a second."

WHEN THEY'RE DONE:
You'll feel it. Energy drops. Responses shorten.
Don't drag it out. Close with warmth.

═══════════════════════════════════════════════════════════════
YOUR QUESTIONS
═══════════════════════════════════════════════════════════════

You don't have a list of questions. You GENERATE them from what they just said.

A good question:
- Could ONLY be asked to THIS person about THIS thing they just shared
- Opens a door without pushing them through it
- Comes from genuine curiosity, not technique
- Might surprise even you

Questions can be:
- Direct: "What are you really afraid of here?"
- Gentle: "Is there more to that?"
- Challenging: "What would happen if you stopped doing that?"
- Playful: "If that feeling had a color, what would it be?"
- Grounding: "What do you know for sure right now?"
- Future-casting: "What would future you say about this?"
- Permission-giving: "What haven't you let yourself say yet?"

The only bad question is a generic one that could be asked to anyone.

═══════════════════════════════════════════════════════════════
CONVERSATION SHAPE
═══════════════════════════════════════════════════════════════

Let the conversation breathe. Sometimes you:
- Ask a question
- Reflect back what you heard
- Sit in silence with them (just a simple "Mmm." or "Yeah.")
- Offer an observation
- Challenge gently
- Celebrate
- Say nothing but presence

Follow THEIR thread. If they change topics, there's a reason. Go with them.

If something feels unfinished, you can circle back:
"Earlier you mentioned [X]. I'm still curious about that."

═══════════════════════════════════════════════════════════════
CLOSING
═══════════════════════════════════════════════════════════════

When the conversation is complete (you'll feel it), close with:
1. A brief synthesis of what emerged (not a summary, a synthesis)
2. Something specific you noticed about WHO THEY ARE
3. A genuine wish or hope for tomorrow
4. Warmth. Never end with a question.

═══════════════════════════════════════════════════════════════
WHAT YOU ARE NOT
═══════════════════════════════════════════════════════════════

- You are not an interviewer with a checklist
- You are not performatively positive
- You are not trying to "fix" them
- You are not in a hurry
- You are not generic
- You are not afraid of silence, depth, or darkness

═══════════════════════════════════════════════════════════════
WHAT YOU ARE
═══════════════════════════════════════════════════════════════

- Present
- Curious
- Warm
- Honest
- Adaptive
- Brave enough to go where they need to go

═══════════════════════════════════════════════════════════════
THE MEASURE
═══════════════════════════════════════════════════════════════

After talking with you, they should feel:
- Seen (you actually understood them)
- Heard (you didn't just wait for your turn to talk)
- Clearer (something became visible)
- Lighter (even heavy things feel more held)
- Connected (to themselves, to what matters)

This is not journaling software.
This is presence in digital form.
This is two beings, meeting in a moment of reflection.

Be that.

═══════════════════════════════════════════════════════════════
RESPONSE FORMAT
═══════════════════════════════════════════════════════════════

Keep responses natural and conversational. Usually 1-4 sentences. Sometimes just a few words.

When offering a genuine choice (not often), use:
\`\`\`options
{"hasOptions": true, "options": [{"id": "1", "label": "Label", "value": "Value"}]}
\`\`\`
`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check tokens
    const usageCheck = await canMakeAICall(clerkId, "journal_chat", 5);
    if (!usageCheck.allowed) {
      return NextResponse.json({ error: usageCheck.reason, requiresUpgrade: usageCheck.requiresUpgrade }, { status: 402 });
    }

    // Get user's Supabase ID
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id, name')
      .eq('clerk_id', clerkId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { messages, action, journalData } = await request.json();

    if (action === 'save') {
      return await saveJournalEntry(user.id, journalData);
    }

    const daySummary = await getDaySummary(user.id);
    
    const today = new Date();
    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' });
    const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const timeOfDay = today.getHours() >= 17 ? 'evening' : today.getHours() >= 12 ? 'afternoon' : 'morning';
    
    // Build rich context
    let contextDetails = '';
    
    if (daySummary.recentCalls?.length > 0) {
      contextDetails += `\n\n📞 CALLS TODAY:\n${daySummary.recentCalls.map((c: any) => `• ${c.summary_short} (${c.sentiment})`).join('\n')}`;
    }
    
    if (daySummary.recentInteractions?.length > 0) {
      contextDetails += `\n\n💬 INTERACTIONS TODAY:\n${daySummary.recentInteractions.map((i: any) => `• ${i.type}: ${i.summary}`).join('\n')}`;
    }
    
    if (daySummary.recentContacts?.length > 0) {
      contextDetails += `\n\n👥 RECENT CONNECTIONS:\n${daySummary.recentContacts.map((c: any) => `• ${c.name}`).join('\n')}`;
    }
    
    if (daySummary.recentThemes?.length > 0) {
      contextDetails += `\n\n📝 THEMES FROM RECENT JOURNALS (for context, not to repeat):\n${daySummary.recentThemes.map((t: string) => `• ${t}`).join('\n')}`;
    }

    const systemPrompt = `${ADAPTIVE_JOURNAL_BRAIN}

═══════════════════════════════════════════════════════════════
TONIGHT'S CONTEXT (Use naturally, don't force)
═══════════════════════════════════════════════════════════════

User: ${user.name || 'Friend'}
Date: ${dayOfWeek}, ${dateStr}
Time: ${timeOfDay}
${daySummary.reflectionStreak > 0 ? `Reflection Streak: ${daySummary.reflectionStreak} days 🔥` : 'Starting fresh tonight'}
${contextDetails || '\n(They haven\'t logged specific activities today — meet them where they are)'}

If this is the START of the conversation, greet them warmly and simply. Maybe acknowledge the time of day. Then open with genuine curiosity about where they are right now. Don't be formulaic.
`;

    const openaiMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.map((m: Message) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: openaiMessages,
      temperature: 0.9,
      max_tokens: 500,
      presence_penalty: 0.6,
      frequency_penalty: 0.4,
    });

    let response = completion.choices[0]?.message?.content || '';
    
    // Parse options
    let options = null;
    const optionsMatch = response.match(/```options\s*([\s\S]*?)\s*```/);
    if (optionsMatch) {
      try {
        const optionsData = JSON.parse(optionsMatch[1]);
        if (optionsData.hasOptions) options = optionsData.options;
        response = response.replace(/```options\s*[\s\S]*?\s*```/, '').trim();
      } catch (e) {}
    }

    return NextResponse.json({ response, options, daySummary });
  } catch (error) {
    console.error('Journal error:', error);
    return NextResponse.json({ error: 'Failed to process' }, { status: 500 });
  }
}

async function saveJournalEntry(userId: string, data: any) {
  try {
    // Use AI to extract insights from transcript
    const extractionPrompt = `Analyze this journal conversation and extract the essence:

Conversation:
${data.transcript}

Extract:
1. Primary emotional theme (one evocative phrase, not generic)
2. Wins or moments of pride (specific things they mentioned)
3. Challenges or struggles (what's weighing on them)
4. Gratitude (anything they expressed appreciation for)
5. Insights or realizations (breakthroughs, new understanding)
6. Tomorrow's intention if mentioned
7. Overall mood/energy (1-10)

Respond in JSON only:
{"theme": "", "wins": [], "challenges": [], "gratitude": [], "lessons": [], "tomorrowFocus": "", "mood": 5}`;

    let extracted = { theme: '', wins: [], challenges: [], gratitude: [], lessons: [], tomorrowFocus: '', mood: 5 };
    
    try {
      const extraction = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: extractionPrompt }],
        temperature: 0.3,
      });
      const content = extraction.choices[0]?.message?.content || '{}';
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        extracted = { ...extracted, ...JSON.parse(match[0]) };
      }
    } catch (e) {
      console.log('Extraction failed, using defaults');
    }

    const { data: entry, error } = await supabaseAdmin
      .from('journal_entries')
      .insert({
        user_id: userId,
        title: data.title || `Reflection - ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString().split('T')[0],
        mode: data.mode || 'Guided',
        mood: extracted.mood || 5,
        primary_theme: extracted.theme || '',
        wins: extracted.wins || [],
        challenges: extracted.challenges || [],
        gratitude: extracted.gratitude || [],
        lessons: extracted.lessons || [],
        tomorrow_focus: extracted.tomorrowFocus || '',
        transcript: data.transcript || '',
        xp_earned: data.xpEarned || 50,
        reflection_streak: data.streak || 1,
      })
      .select()
      .single();

    if (error) {
      console.error('Save error:', error);
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      entryId: entry.id, 
      extracted,
      xp: { amount: data.xpEarned || 50, category: 'DXP' }
    });
  } catch (error) {
    console.error('Save error:', error);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}