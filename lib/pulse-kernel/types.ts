// Pulse Kernel Types - The Core of the Personal Assistant Engine

export interface UserProfile {
  id: string;
  name: string;
  preferences: {
    workingHours: { start: string; end: string };
    timezone: string;
    communicationStyle: 'brief' | 'detailed' | 'casual';
    adhdMode: boolean;
    focusSessionLength: number; // minutes
    peakEnergyTimes: string[]; // e.g., ["09:00", "14:00"]
    useAIMicroTasks?: boolean; // NEW: Enable AI-generated micro-tasks (default true)
  };
  patterns: {
    typicalTaskDuration: Record<string, number>;
    procrastinationTriggers: string[];
    focusKillers: string[];
    motivators: string[];
    completionPatterns: { dayOfWeek: number; hour: number; successRate: number }[];
  };
  emotionalBaseline: {
    currentStressLevel: number; // 0-10
    currentEnergyLevel: number; // 0-10
    currentMoodIndicators: string[];
  };
}

export interface ContextWindow {
  timestamp: Date;
  location?: string;
  deviceType: 'mobile' | 'desktop';
  currentActivity?: string;
  recentActions: RecentAction[];
  activeApps?: string[];
  calendarContext: CalendarContext;
  environmentalFactors: {
    timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
    dayType: 'workday' | 'weekend' | 'holiday';
    isInMeeting: boolean;
    focusModeActive: boolean;
  };
}

export interface RecentAction {
  type: string;
  target: string;
  timestamp: Date;
  duration?: number;
}

export interface CalendarContext {
  currentEvent?: CalendarEvent;
  nextEvent?: CalendarEvent;
  todaysEvents: CalendarEvent[];
  upcomingDeadlines: Deadline[];
  freeSlots: TimeSlot[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  attendees?: string[];
  type: 'meeting' | 'focus' | 'personal' | 'deadline';
}

export interface Deadline {
  id: string;
  title: string;
  dueDate: Date;
  priority: 'critical' | 'high' | 'medium' | 'low';
  relatedTaskId?: string;
}

export interface TimeSlot {
  start: Date;
  end: Date;
  duration: number; // minutes
}

export interface Memory {
  recentInteractions: Interaction[];
  knowledgeGraph: KnowledgeNode[];
  patterns: DetectedPattern[];
  preferences: LearnedPreference[];
  relationships: RelationshipMemory[];
}

export interface Interaction {
  id: string;
  type: 'task_completed' | 'task_deferred' | 'communication' | 'search' | 'capture' | 'focus_session';
  content: string;
  timestamp: Date;
  outcome?: 'success' | 'abandoned' | 'partial';
  emotionalContext?: string;
}

export interface KnowledgeNode {
  id: string;
  type: 'person' | 'project' | 'topic' | 'location' | 'preference';
  label: string;
  properties: Record<string, any>;
  connections: { nodeId: string; relationship: string; strength: number }[];
  lastAccessed: Date;
  accessCount: number;
}

export interface DetectedPattern {
  id: string;
  type: 'behavior' | 'preference' | 'schedule' | 'emotional' | 'productivity';
  description: string;
  confidence: number; // 0-1
  occurrences: number;
  lastSeen: Date;
  actionable: boolean;
  suggestedAction?: string;
}

export interface LearnedPreference {
  category: string;
  preference: string;
  confidence: number;
  learnedFrom: string[];
}

export interface RelationshipMemory {
  personId: string;
  name: string;
  relationship: string;
  interactionHistory: { date: Date; type: string; sentiment: string }[];
  preferences: Record<string, string>;
  importantDates: { date: string; description: string }[];
  communicationStyle: string;
}

// Anticipation Types
export interface PredictedNeed {
  id: string;
  type: 'task' | 'reminder' | 'preparation' | 'communication' | 'self-care' | 'focus';
  title: string;
  description: string;
  confidence: number;
  urgency: 'immediate' | 'soon' | 'upcoming' | 'background';
  suggestedAction: string;
  reasoning: string;
  preventiveValue: string; // What problem this prevents
}

// Proactive Action Types
export interface ProactiveAction {
  id: string;
  type: 'auto_task' | 'draft_communication' | 'prepare_materials' | 'schedule' | 'reminder' | 'nudge';
  title: string;
  description: string;
  status: 'proposed' | 'approved' | 'executing' | 'completed' | 'rejected';
  payload: any;
  createdAt: Date;
  reasoning: string;
  impactScore: number; // How helpful this action is
  userApprovalRequired: boolean;
}

// Attention Management Types
export interface AttentionState {
  currentFocus: string | null;
  focusScore: number; // 0-100
  distractionLevel: number; // 0-10
  sessionDuration: number; // minutes in current focus
  streakCount: number; // consecutive focused sessions
  lastBreak: Date | null;
  suggestedMode: 'deep_focus' | 'light_work' | 'break' | 'wind_down';
  blockers: AttentionBlocker[];
}

export interface AttentionBlocker {
  type: 'overwhelm' | 'unclear_next_step' | 'too_many_options' | 'energy_low' | 'anxiety' | 'distraction';
  severity: number;
  suggestedIntervention: string;
}

export interface MicroTask {
  id: string;
  parentTaskId: string;
  title: string;
  estimatedMinutes: number;
  order: number;
  completed: boolean;
  dopamineReward: string; // What the user "unlocks" by completing
}

export interface FocusPrompt {
  type: 'start' | 'continue' | 'rescue' | 'celebrate' | 'break';
  message: string;
  tone: 'encouraging' | 'gentle' | 'urgent' | 'celebratory';
  action?: { label: string; callback: string };
}

// Next Best Action
export interface NextBestAction {
  id: string;
  action: string;
  reasoning: string;
  estimatedTime: number;
  energyRequired: 'low' | 'medium' | 'high';
  impactScore: number;
  contextFit: number; // How well it fits current context
  alternativeActions: { action: string; reason: string }[];
}

// Assistant Response Types
export interface AssistantResponse {
  message: string;
  tone: 'calm' | 'encouraging' | 'direct' | 'celebratory' | 'supportive';
  suggestedActions: { label: string; action: string; primary?: boolean }[];
  context?: string;
  followUp?: string;
}

// Logistics Types
export interface LogisticsTask {
  type: 'schedule' | 'travel' | 'budget' | 'relationship' | 'home' | 'health';
  title: string;
  details: any;
  automationLevel: 'full' | 'semi' | 'manual';
  status: 'pending' | 'in_progress' | 'completed';
}
