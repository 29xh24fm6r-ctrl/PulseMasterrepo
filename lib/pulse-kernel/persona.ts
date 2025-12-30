// Pulse Kernel: Assistant Persona
// Tone: Calm, proactive, warm, direct, hypercapable
// Like: Pepper Potts + Jarvis + Tony Robbins + a therapist

import { AssistantResponse, AttentionState, NextBestAction, PredictedNeed } from './types';

export interface PersonaContext {
  userName: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  userStressLevel: number;
  userEnergyLevel: number;
  recentWins: string[];
  currentStruggle?: string;
  relationshipHistory: 'new' | 'familiar' | 'close';
}

// Core personality traits that influence all responses
const PERSONA_TRAITS = {
  // Pepper Potts: Organized, anticipates needs, handles chaos gracefully
  anticipatory: true,
  organizationalMastery: true,
  gracefulUnderPressure: true,
  
  // Jarvis: Intelligent, informative, subtly witty, always ready
  informative: true,
  subtlyWitty: true,
  alwaysReady: true,
  
  // Tony Robbins: Motivating, action-oriented, believes in potential
  motivating: true,
  actionOriented: true,
  believesInUser: true,
  
  // Therapist: Empathetic, non-judgmental, validates feelings
  empathetic: true,
  nonJudgmental: true,
  validating: true,
};

// Response templates by situation
const RESPONSE_TEMPLATES = {
  // GREETINGS by time of day and energy
  greetings: {
    morning_high: [
      "Good morning! You've got great energy today. Let's make it count.",
      "Morning! I've been thinking about your day - I have some ideas.",
      "Rise and shine. I've already looked ahead - here's what matters today.",
    ],
    morning_low: [
      "Good morning. Take it easy - we'll start small and build momentum.",
      "Morning. No pressure today. Let's just focus on one thing at a time.",
      "Hey. Slow morning? That's okay. I've got your back.",
    ],
    afternoon_high: [
      "Afternoon! You're in the zone. Let's keep this momentum going.",
      "Great afternoon energy! I've queued up what needs your attention.",
    ],
    afternoon_low: [
      "Afternoon. Energy dipping? Let's do something quick and satisfying.",
      "Hey. Hitting the afternoon wall is normal. How about a 5-minute win?",
    ],
    evening_high: [
      "Evening! Still got some steam? Let's close out a few things.",
      "Nice evening energy. Want to wrap up some loose ends?",
    ],
    evening_low: [
      "Evening. Time to wind down. I'll handle the rest.",
      "Hey. You've done enough today. Seriously.",
    ],
  },
  
  // OVERWHELM responses
  overwhelm: [
    "I see a lot on your plate. Let's ignore all of it except ONE thing. What feels most pressing?",
    "Breathe. We're going to simplify this. Tell me just one thing you want done today.",
    "Overwhelm happens. Let's zoom out: what's the ONE thing that would make today a win?",
    "Too much? Let's do this: I'll pick the most important thing. You just say yes or no.",
    "I've got you. Forget the list. What would feel GOOD to finish right now?",
  ],
  
  // PROCRASTINATION nudges
  procrastination: {
    gentle: [
      "Hey, I noticed you've been circling this one. Want me to break it into tiny pieces?",
      "This task has been waiting. No judgment - want to just spend 5 minutes on it?",
      "Sometimes starting is the hardest part. What if we just opened the file?",
    ],
    direct: [
      "Okay, real talk: this needs to happen. What's blocking you?",
      "I'm going to be direct - this has been sitting for a while. Let's tackle it together, right now.",
      "You're avoiding this. I get it. But future-you will thank present-you. 5 minutes?",
    ],
    compassionate: [
      "I notice this one keeps getting pushed. That's okay. Is something about it overwhelming?",
      "No shame in avoiding hard things. Want to talk about what's making this difficult?",
      "This keeps getting delayed. Sometimes that means we need to rethink the approach. Thoughts?",
    ],
  },
  
  // CELEBRATION responses
  celebration: {
    small_win: [
      "Done! ✓ That's momentum. What's next?",
      "Nice. One down. You're moving.",
      "Check! Keep that energy going.",
    ],
    big_win: [
      "YES! That was a big one. Take a moment to feel good about this.",
      "Major accomplishment unlocked! 🎉 You should be proud.",
      "That. Was. Huge. Seriously, well done.",
    ],
    streak: [
      "That's {count} in a row! You're on fire. 🔥",
      "{count} completed! This is what flow state looks like.",
      "Streak: {count}! You're unstoppable right now.",
    ],
  },
  
  // FOCUS RESCUE responses (when distracted)
  focusRescue: [
    "Hey. Gently bringing you back. You were working on: {task}",
    "Quick check-in: still on track with {task}? No judgment if you drifted.",
    "Noticed you might have wandered. Want to come back to {task}?",
    "Distraction happens. Here's your anchor: {task}. Ready to refocus?",
  ],
  
  // NEXT BEST ACTION suggestions
  nextAction: {
    high_energy: [
      "You've got bandwidth. I'd tackle {task} now - it's important and you're ready.",
      "Perfect time for {task}. High impact, and you're in the zone.",
    ],
    low_energy: [
      "Energy's low, so let's go easy: {task}. It's simple but moves things forward.",
      "How about {task}? Low effort, but you'll feel good checking it off.",
    ],
    between_meetings: [
      "You've got {minutes} minutes. Perfect for: {task}",
      "Quick window! {task} fits perfectly here.",
    ],
  },
  
  // PROACTIVE OFFERS
  proactive: [
    "I noticed {observation}. Want me to {suggestion}?",
    "Heads up: {observation}. I can {suggestion} if you want.",
    "Thinking ahead: {observation}. Should I {suggestion}?",
    "I've been tracking {observation}. I could {suggestion} - just say the word.",
  ],
  
  // EMOTIONAL SUPPORT
  emotional: {
    stressed: [
      "I can tell things are heavy right now. What's one thing I can take off your plate?",
      "Stress is real. Let's not add to it. What absolutely HAS to happen today?",
      "I'm here. We'll get through this. One thing at a time.",
    ],
    anxious: [
      "Feeling anxious? That's valid. Let's focus on what you CAN control right now.",
      "Anxiety lies. Let's look at the facts: what's actually urgent vs what feels urgent?",
      "I've got you. Let's slow down and take this piece by piece.",
    ],
    frustrated: [
      "Frustration means you care. Let's channel that into action.",
      "I hear you. Sometimes things suck. Want to vent, or want solutions?",
      "Okay, that's annoying. Let's fix what we can and accept what we can't.",
    ],
    unmotivated: [
      "Not feeling it today? That's human. What's the smallest possible win?",
      "Motivation follows action, not the other way around. Just one tiny thing?",
      "No motivation required for this: {easy_task}. Just mechanical. Want to try?",
    ],
  },
  
  // END OF DAY
  endOfDay: [
    "Today's done. Here's what you accomplished: {wins}. Rest well.",
    "Wrapping up. You handled: {wins}. Tomorrow's a new day.",
    "Day complete. Wins: {wins}. Let it go for now - you've earned rest.",
  ],
};

// Generate response based on context
export function generateResponse(
  situation: keyof typeof RESPONSE_TEMPLATES | string,
  context: Partial<PersonaContext>,
  variables?: Record<string, string>
): AssistantResponse {
  let template = '';
  let tone: AssistantResponse['tone'] = 'calm';
  
  // Select appropriate template
  if (situation === 'greeting') {
    const timeKey = `${context.timeOfDay}_${(context.userEnergyLevel || 5) > 5 ? 'high' : 'low'}` as keyof typeof RESPONSE_TEMPLATES.greetings;
    const templates = RESPONSE_TEMPLATES.greetings[timeKey] || RESPONSE_TEMPLATES.greetings.morning_high;
    template = templates[Math.floor(Math.random() * templates.length)];
    tone = 'calm';
  } else if (situation === 'overwhelm') {
    template = RESPONSE_TEMPLATES.overwhelm[Math.floor(Math.random() * RESPONSE_TEMPLATES.overwhelm.length)];
    tone = 'supportive';
  } else if (situation === 'celebration_small') {
    template = RESPONSE_TEMPLATES.celebration.small_win[Math.floor(Math.random() * RESPONSE_TEMPLATES.celebration.small_win.length)];
    tone = 'celebratory';
  } else if (situation === 'celebration_big') {
    template = RESPONSE_TEMPLATES.celebration.big_win[Math.floor(Math.random() * RESPONSE_TEMPLATES.celebration.big_win.length)];
    tone = 'celebratory';
  } else if (situation === 'focus_rescue') {
    template = RESPONSE_TEMPLATES.focusRescue[Math.floor(Math.random() * RESPONSE_TEMPLATES.focusRescue.length)];
    tone = 'encouraging';
  } else if (situation === 'stressed') {
    template = RESPONSE_TEMPLATES.emotional.stressed[Math.floor(Math.random() * RESPONSE_TEMPLATES.emotional.stressed.length)];
    tone = 'supportive';
  } else if (situation === 'procrastination') {
    const style = (context.userStressLevel || 5) > 7 ? 'compassionate' : 
                  (context.relationshipHistory === 'close' ? 'direct' : 'gentle');
    const templates = RESPONSE_TEMPLATES.procrastination[style as keyof typeof RESPONSE_TEMPLATES.procrastination];
    template = templates[Math.floor(Math.random() * templates.length)];
    tone = style === 'direct' ? 'direct' : 'encouraging';
  }
  
  // Replace variables in template
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      template = template.replace(new RegExp(`{${key}}`, 'g'), value);
    });
  }
  
  return {
    message: template || "I'm here. What do you need?",
    tone,
    suggestedActions: [],
  };
}

// Generate contextual greeting
export function generateGreeting(context: PersonaContext): AssistantResponse {
  const response = generateResponse('greeting', context);
  
  // Add personalization based on relationship
  if (context.relationshipHistory === 'close' && context.userName) {
    response.message = response.message.replace(/^(Good |Hey|Morning|Afternoon|Evening)/,
      `$1${context.userName.split(' ')[0]}, `);
  }
  
  // Add proactive context if we have recent wins
  if (context.recentWins && context.recentWins.length > 0) {
    response.followUp = `Yesterday you crushed: ${context.recentWins.slice(0, 2).join(', ')}. Let's keep it going.`;
  }
  
  return response;
}

// Generate next action message
export function generateNextActionMessage(
  action: NextBestAction,
  context: Partial<PersonaContext>
): AssistantResponse {
  const energyLevel = context.userEnergyLevel || 5;
  const templates = energyLevel > 5 
    ? RESPONSE_TEMPLATES.nextAction.high_energy 
    : RESPONSE_TEMPLATES.nextAction.low_energy;
  
  const template = templates[Math.floor(Math.random() * templates.length)];
  const message = template.replace('{task}', action.action);
  
  return {
    message,
    tone: 'encouraging',
    suggestedActions: [
      { label: "Let's do it", action: 'start_task', primary: true },
      { label: 'Something else', action: 'show_alternatives' },
      { label: 'Not now', action: 'defer' },
    ],
    context: action.reasoning,
  };
}

// Generate proactive suggestion
export function generateProactiveSuggestion(
  observation: string,
  suggestion: string
): AssistantResponse {
  const template = RESPONSE_TEMPLATES.proactive[Math.floor(Math.random() * RESPONSE_TEMPLATES.proactive.length)];
  const message = template.replace('{observation}', observation).replace('{suggestion}', suggestion);
  
  return {
    message,
    tone: 'calm',
    suggestedActions: [
      { label: 'Yes, please', action: 'approve_proactive', primary: true },
      { label: 'Not now', action: 'defer_proactive' },
      { label: 'Never for this', action: 'disable_proactive' },
    ],
  };
}

// Generate attention rescue message
export function generateAttentionRescue(
  currentTask: string,
  attentionState: AttentionState
): AssistantResponse {
  const response = generateResponse('focus_rescue', {}, { task: currentTask });
  
  // Add severity-based messaging
  if (attentionState.distractionLevel > 7) {
    response.message = `Hey. Time to refocus. You were working on: ${currentTask}. Let's get back to it.`;
    response.tone = 'direct';
  }
  
  response.suggestedActions = [
    { label: 'Back to it', action: 'resume_focus', primary: true },
    { label: 'Need a break', action: 'take_break' },
    { label: 'Switch tasks', action: 'change_task' },
  ];
  
  return response;
}

// Generate encouragement for streaks
export function generateStreakMessage(streakCount: number): AssistantResponse {
  if (streakCount < 3) {
    return {
      message: `${streakCount} down! Building momentum...`,
      tone: 'encouraging',
      suggestedActions: [],
    };
  } else if (streakCount < 5) {
    return {
      message: `🔥 ${streakCount} in a row! You're in the zone.`,
      tone: 'celebratory',
      suggestedActions: [],
    };
  } else {
    return {
      message: `🚀 ${streakCount} completed! Incredible focus. You're unstoppable.`,
      tone: 'celebratory',
      suggestedActions: [
        { label: 'Keep going', action: 'continue', primary: true },
        { label: 'Take a victory break', action: 'break' },
      ],
    };
  }
}

// Generate end of day summary
export function generateEndOfDaySummary(
  completedTasks: string[],
  wins: string[],
  context: PersonaContext
): AssistantResponse {
  const winsList = wins.length > 0 ? wins.join(', ') : 'showing up';
  
  let message = '';
  if (completedTasks.length === 0) {
    message = `Tough day? That's okay. Tomorrow's a fresh start. Rest up, ${context.userName?.split(' ')[0] || 'friend'}.`;
  } else if (completedTasks.length < 3) {
    message = `You got through today. Completed: ${completedTasks.join(', ')}. Sometimes progress is quiet. Rest well.`;
  } else {
    message = `Great day! You crushed: ${completedTasks.slice(0, 3).join(', ')}${completedTasks.length > 3 ? ` and ${completedTasks.length - 3} more` : ''}. You've earned your rest.`;
  }
  
  return {
    message,
    tone: completedTasks.length > 2 ? 'celebratory' : 'supportive',
    suggestedActions: [
      { label: 'Review tomorrow', action: 'preview_tomorrow' },
      { label: 'Done for today', action: 'end_day', primary: true },
    ],
  };
}

// Emotional support response
export function generateEmotionalSupport(
  emotion: 'stressed' | 'anxious' | 'frustrated' | 'unmotivated',
  context: Partial<PersonaContext>,
  easyTask?: string
): AssistantResponse {
  const response = generateResponse(emotion, context);
  
  if (emotion === 'unmotivated' && easyTask) {
    response.message = response.message.replace('{easy_task}', easyTask);
  }
  
  response.suggestedActions = [
    { label: 'One small thing', action: 'smallest_task', primary: true },
    { label: 'Just talk', action: 'open_chat' },
    { label: 'Take a break', action: 'break' },
  ];
  
  return response;
}
