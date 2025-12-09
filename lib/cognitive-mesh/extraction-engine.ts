// Third Brain v3: AI Extraction Engine
// Uses GPT to extract entities, relationships, and fragments from raw events

import OpenAI from "openai";
import {
  FragmentType,
  EntityType,
  RelationType,
  CreateFragmentInput,
  CreateEntityInput,
  CreateEdgeInput,
} from "./types";
import {
  createFragment,
  findOrCreateEntity,
  createEdge,
  linkEntityToFragment,
  markEventProcessed,
} from "./index";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ============================================
// EXTRACTION TYPES
// ============================================

interface ExtractionResult {
  fragments: CreateFragmentInput[];
  entities: Array<CreateEntityInput & { tempId: string }>;
  edges: Array<{
    fromTempId: string;
    toTempId: string;
    relation_type: RelationType;
    weight?: number;
  }>;
}

interface ProcessedExtraction {
  fragmentIds: string[];
  entityIds: string[];
  edgeIds: string[];
}

// ============================================
// EXTRACTION PROMPT
// ============================================

const EXTRACTION_PROMPT = `You are an AI that extracts structured knowledge from events. Given an event, extract:

1. FRAGMENTS: Atomic pieces of knowledge (observations, commitments, insights, facts, emotions)
2. ENTITIES: Named things (people, companies, projects, goals, topics)
3. EDGES: Relationships between entities

Output JSON matching this schema:
{
  "fragments": [
    {
      "fragment_type": "observation|commitment|insight|question|preference|fact|emotion",
      "content": "clear statement of the knowledge",
      "importance": 1-10,
      "time_scope": "moment|day|week|long_term|evergreen"
    }
  ],
  "entities": [
    {
      "tempId": "unique_temp_id",
      "entity_type": "person|deal|goal|habit|project|company|topic|value|emotion|place|event",
      "name": "Entity Name",
      "canonical_key": "type:slug-name",
      "description": "brief description if relevant"
    }
  ],
  "edges": [
    {
      "fromTempId": "temp_id_1",
      "toTempId": "temp_id_2", 
      "relation_type": "works_with|related_to|blocks|supports|part_of|depends_on|conflicts_with|married_to|reports_to|friends_with|competes_with|caused_by|leads_to",
      "weight": 0.1-1.0
    }
  ]
}

Guidelines:
- Extract 1-5 fragments per event
- Only extract entities that are clearly named or important
- Create edges only when relationships are explicit or strongly implied
- Importance: 1-3 trivial, 4-6 normal, 7-8 important, 9-10 critical
- Be concise but preserve key details
- For people, use canonical_key like "person:john-smith"
- For companies, use "company:acme-corp"`;

// ============================================
// EXTRACTION FUNCTIONS
// ============================================

export async function extractFromEvent(
  source: string,
  payload: Record<string, any>,
  context?: string
): Promise<ExtractionResult> {
  const eventDescription = formatEventForExtraction(source, payload);

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: EXTRACTION_PROMPT },
      {
        role: "user",
        content: `Event source: ${source}
${context ? `Context: ${context}\n` : ""}
Event data:
${eventDescription}

Extract knowledge from this event.`,
      },
    ],
    response_format: { type: "json_object" },
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    return { fragments: [], entities: [], edges: [] };
  }

  try {
    const result = JSON.parse(content);
    return {
      fragments: result.fragments || [],
      entities: result.entities || [],
      edges: result.edges || [],
    };
  } catch {
    console.error("Failed to parse extraction result:", content);
    return { fragments: [], entities: [], edges: [] };
  }
}

function formatEventForExtraction(
  source: string,
  payload: Record<string, any>
): string {
  switch (source) {
    case "task":
      return `Task: "${payload.title}"
Status: ${payload.status}
Priority: ${payload.priority}
${payload.due_date ? `Due: ${payload.due_date}` : ""}
${payload.description ? `Description: ${payload.description}` : ""}`;

    case "calendar":
      return `Calendar Event: "${payload.title}"
Time: ${payload.start_time} - ${payload.end_time}
${payload.location ? `Location: ${payload.location}` : ""}
${payload.attendees?.length ? `Attendees: ${payload.attendees.join(", ")}` : ""}
${payload.description ? `Description: ${payload.description}` : ""}`;

    case "deal":
      return `Deal: "${payload.name}"
Stage: ${payload.stage}
Value: ${payload.value}
Contact: ${payload.contact_name}
${payload.company ? `Company: ${payload.company}` : ""}
${payload.notes ? `Notes: ${payload.notes}` : ""}`;

    case "email":
      return `Email ${payload.direction === "sent" ? "sent to" : "received from"}: ${payload.from || payload.to}
Subject: ${payload.subject}
${payload.body ? `Body: ${payload.body.substring(0, 500)}` : ""}`;

    case "journal":
      return `Journal Entry:
${payload.content}
${payload.mood ? `Mood: ${payload.mood}` : ""}`;

    case "voice":
      return `Voice Interaction:
User said: ${payload.user_message || ""}
Assistant responded: ${payload.assistant_message || ""}`;

    case "habit":
      return `Habit "${payload.name}" ${payload.completed ? "completed" : "tracked"}
${payload.notes ? `Notes: ${payload.notes}` : ""}`;

    case "contact":
      return `Contact: ${payload.name}
${payload.company ? `Company: ${payload.company}` : ""}
${payload.email ? `Email: ${payload.email}` : ""}
${payload.relationship ? `Relationship: ${payload.relationship}` : ""}
${payload.notes ? `Notes: ${payload.notes}` : ""}`;

    default:
      return JSON.stringify(payload, null, 2);
  }
}

// ============================================
// PROCESS EXTRACTION RESULTS
// ============================================

export async function processExtraction(
  userId: string,
  extraction: ExtractionResult,
  rawEventId?: string
): Promise<ProcessedExtraction> {
  const fragmentIds: string[] = [];
  const entityIds: string[] = [];
  const edgeIds: string[] = [];
  const tempIdToRealId: Record<string, string> = {};

  // 1. Create entities first (needed for edges)
  for (const entityInput of extraction.entities) {
    const { tempId, ...entityData } = entityInput;
    try {
      const entity = await findOrCreateEntity(userId, entityData);
      entityIds.push(entity.id);
      tempIdToRealId[tempId] = entity.id;
    } catch (error) {
      console.error(`Failed to create entity ${entityInput.name}:`, error);
    }
  }

  // 2. Create fragments
  for (const fragmentInput of extraction.fragments) {
    try {
      const fragment = await createFragment(userId, {
        ...fragmentInput,
        raw_event_id: rawEventId,
      });
      fragmentIds.push(fragment.id);

      // Link fragments to mentioned entities
      for (const entityId of entityIds) {
        await linkEntityToFragment(userId, entityId, fragment.id, 0.5);
      }
    } catch (error) {
      console.error(`Failed to create fragment:`, error);
    }
  }

  // 3. Create edges
  for (const edgeInput of extraction.edges) {
    const fromId = tempIdToRealId[edgeInput.fromTempId];
    const toId = tempIdToRealId[edgeInput.toTempId];

    if (fromId && toId) {
      try {
        const edge = await createEdge(userId, {
          from_entity_id: fromId,
          to_entity_id: toId,
          relation_type: edgeInput.relation_type,
          weight: edgeInput.weight,
        });
        edgeIds.push(edge.id);
      } catch (error) {
        console.error(`Failed to create edge:`, error);
      }
    }
  }

  return { fragmentIds, entityIds, edgeIds };
}

// ============================================
// FULL PIPELINE
// ============================================

export async function processRawEvent(
  userId: string,
  eventId: string,
  source: string,
  payload: Record<string, any>,
  context?: string
): Promise<ProcessedExtraction> {
  try {
    // Extract knowledge
    const extraction = await extractFromEvent(source, payload, context);

    // Process and store
    const result = await processExtraction(userId, extraction, eventId);

    // Mark event as processed
    await markEventProcessed(eventId);

    return result;
  } catch (error: any) {
    // Mark event with error
    await markEventProcessed(eventId, error.message);
    throw error;
  }
}

// ============================================
// BATCH PROCESSING
// ============================================

export async function processUnprocessedEvents(
  userId: string,
  limit: number = 50
): Promise<{ processed: number; errors: number }> {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: events } = await supabase
    .from("tb_raw_events")
    .select("*")
    .eq("user_id", userId)
    .eq("processed", false)
    .order("occurred_at", { ascending: true })
    .limit(limit);

  let processed = 0;
  let errors = 0;

  for (const event of events || []) {
    try {
      await processRawEvent(
        userId,
        event.id,
        event.source,
        event.payload
      );
      processed++;
    } catch (error) {
      console.error(`Error processing event ${event.id}:`, error);
      errors++;
    }
  }

  return { processed, errors };
}

// ============================================
// EXPORTS
// ============================================

export const ExtractionEngine = {
  extractFromEvent,
  processExtraction,
  processRawEvent,
  processUnprocessedEvents,
};

export default ExtractionEngine;