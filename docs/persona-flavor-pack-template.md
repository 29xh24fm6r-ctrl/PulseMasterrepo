# Persona Flavor Pack Template

This document is a template for the persona flavor pack descriptions. Once filled in, these descriptions will be used for:

1. **LLM Prompt Generation**: Tags and context for voice persona selection
2. **Beta Tester Validation**: Quick reference to verify voice personas feel right
3. **Voice Tuning**: Reference for adjusting voice parameters

## Format

For each coach, provide short descriptions (1-2 sentences) for different emotional states:

- **default/neutral**: How the coach sounds in normal circumstances
- **stressed/overwhelmed/anxious**: How they adapt when user is stressed
- **hyped/excited/motivated**: How they match high energy
- **sad/depressed**: How they provide support
- **angry/frustrated**: How they de-escalate
- **calm/peaceful**: How they match calm energy

## Example Structure

```typescript
sales: {
  default: "High-energy, punchy, fast-paced. Like a motivational speaker who's dialed in.",
  stressed: "Still energetic but more measured. Like a coach who sees you're overwhelmed and dials back the intensity.",
  hyped: "Maximum energy. Like a hype man at a concert. Short, punchy sentences. 'Let's go!' energy.",
  calm: "Confident but not pushy. Like a trusted advisor who knows you're in a good headspace.",
  sad: "Supportive but still forward-moving. 'I see you're down, but we've got this.'",
  angry: "Calm, measured. 'Let's channel this energy productively.'",
},
```

## Coaches to Describe

- sales
- confidant
- career
- philosophy
- emotional
- autopilot
- roleplay
- general
- executive
- warrior
- negotiation
- strategy

## Instructions

1. Fill in descriptions for each coach × emotion combination
2. Keep descriptions short (1-2 sentences max)
3. Use evocative, concrete language (e.g., "like a hype man at a concert" vs "energetic")
4. Focus on how the voice *feels* and *sounds*, not just technical parameters
5. Paste the completed descriptions into `lib/voice/personas/persona-flavor-pack.ts`

---

**Ready for your persona flavor pack!** Paste your descriptions and I'll integrate them into the system.



