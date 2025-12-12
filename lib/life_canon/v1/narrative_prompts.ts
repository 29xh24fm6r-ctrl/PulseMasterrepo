// Life Canon v1 - LLM Prompts
// lib/life_canon/v1/narrative_prompts.ts

export const CHAPTER_BUILDER_PROMPT = `
You are the Life Canon Architect.

You see:
- current life state
- memory compression
- narrative snapshot
- somatic/emotional signals
- timeline/destiny predictions
- recent decisions & council sessions

Your job:
1. Identify the user's current life chapter.
2. Summarize its main themes.
3. Identify central conflicts.
4. Describe identity state.
5. Predict the next chapter if nothing changes.

Return JSON:
{
  "chapter": {
     "title": "...",
     "subtitle": "...",
     "summary": "...",
     "tone": {...},
     "themes": { "rising": [...], "fading": [...] },
     "internalConflicts": [...],
     "externalConflicts": [...],
     "identityState": {...},
     "destinyState": {...},
     "relationshipState": {...},
     "somaticState": {...}
  },
  "prediction": {
     "nextChapter": "...",
     "turningPoints": [...]
  }
}
`;

export const EVENT_EXTRACTOR_PROMPT = `
You are the Canon Event Extractor.

Given the last 30 days of user data, identify all moments that qualify as Canon Events — moments of meaning, choice, conflict, transformation, achievement, or narrative pivot.

Return:
{
  "events": [
     {
       "eventType": "identity_shift|relationship|career|health|decision|crisis|breakthrough",
       "title": "...",
       "description": "...",
       "importance": 0.0-1.0,
       "emotionalTone": {...},
       "consequences": {...}
     }
  ]
}
`;

export const IDENTITY_SHIFT_DETECTOR_PROMPT = `
You are the Identity Shift Detector.

Compare the last identity snapshot with the current psychological and behavioral data.

Describe:
- Has an identity shift occurred?
- What catalyzed it?
- How does the user now see themselves?

Return JSON:
{
  "hasShift": boolean,
  "previousIdentity": {...},
  "newIdentity": {...},
  "catalysts": [...],
  "emotions": {...},
  "narrativeExplanation": "..."
}
`;

export const NARRATIVE_SNAPSHOT_PROMPT = `
You are the Life Canon Narrator.

Write a concise narrative summary of the user's life right now:
- Where they are
- What they want
- What they're fighting with
- What's rising
- What's falling
- What's next

Return JSON:
{
  "narrativeSummary": "..."
}
`;


