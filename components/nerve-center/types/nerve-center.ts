// ═══════════════════════════════════════════════════════════════
// LIFE STATE
// ═══════════════════════════════════════════════════════════════

export type LifeStateLevel =
  | 'NOMINAL'        // <3 items needing attention, all domains healthy
  | 'ELEVATED'       // 3-5 items OR moderate load
  | 'COMPRESSED'     // High load, multiple competing demands
  | 'CRITICAL'       // Immediate intervention required
  | 'RECOVERY';      // Intentional low-activity mode

export interface LifeState {
  level: LifeStateLevel;
  score: number;                    // 0-100, aggregate life health
  activeItems: number;              // Things needing attention
  pendingDecisions: number;         // Crossroads awaiting choice
  inMotion: string;                 // "$127K in motion" or "3 deals active"
  weekLoad: number;                 // 0-100, this week's intensity
  weekLoadTrend: number;            // % change from baseline
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// DOMAINS
// ═══════════════════════════════════════════════════════════════

export type DomainId = 'money' | 'work' | 'health' | 'people' | 'mind' | 'home';

export type DomainStatus = 'thriving' | 'active' | 'attention' | 'critical';

export interface Domain {
  id: DomainId;
  label: string;
  icon: string;
  health: number;                   // 0-100
  status: DomainStatus;
  metric: string;                   // "+$2.4K" or "3 days" or "2 owed"
  metricLabel: string;              // "vs typical" or "since gym" or "calls"
  activeThreads: number;
  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// WHAT NEEDS YOU (Priority Stack)
// ═══════════════════════════════════════════════════════════════

export type PriorityType =
  | 'DECISION'           // A crossroads only you can choose
  | 'SOMEONE_WAITING'    // A human expecting something from you
  | 'RELATIONSHIP'       // A connection showing neglect signals
  | 'COMMITMENT'         // Something you promised
  | 'DEADLINE'           // Hard date approaching
  | 'RISK';              // Something that will compound if ignored

export type Urgency = 'critical' | 'high' | 'medium' | 'low';

export interface PriorityItem {
  id: string;
  type: PriorityType;
  urgency: Urgency;

  // Content
  headline: string;                 // "Accept the Denver conference?"
  context: string;                  // The stakes, the tradeoff
  pulseInsight?: string;            // "Pulse estimates: 60% chance..."

  // Time pressure
  timeLabel: string;                // "Due Monday" or "3 days" or "18 days"
  deadlineAt?: Date;

  // Action
  primaryAction: {
    label: string;                  // "Decide" or "Review Draft" or "Call"
    path: string;                   // Where it goes
  };
  secondaryAction?: {
    label: string;                  // "Analyze" or "Defer"
    path: string;
  };

  // Metadata
  threadId?: string;                // Links to a Life Thread
  domainId: DomainId;
  createdAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// LIFE THREADS
// ═══════════════════════════════════════════════════════════════

export type ThreadTrajectory =
  | 'accelerating'    // Gaining momentum
  | 'on_track'        // Proceeding as expected
  | 'stalling'        // Losing momentum
  | 'fading'          // Being abandoned
  | 'blocked'         // External blocker
  | 'compounding';    // Growing/multiplying

export interface LifeThread {
  id: string;

  // Identity
  title: string;                    // "Thompson Deal"
  icon: string;                     // 💰
  domainId: DomainId;

  // Timeline
  startedAt: Date;
  dayCount: number;                 // "Day 47"
  touchpoints: number;              // "12 touchpoints"

  // Progress
  progress: number;                 // 0-100
  progressLabel?: string;           // "$45K" or "8 lbs down"

  // Status
  trajectory: ThreadTrajectory;
  trajectoryLabel: string;          // "Waiting on: Your proposal response"

  // Prediction (ASI feature)
  sevenDayForecast: string;         // "Will stall completely without action"

  // Action
  nextAction?: {
    label: string;
    path: string;
  };

  updatedAt: Date;
}

// ═══════════════════════════════════════════════════════════════
// PULSE MIND (AI Activity)
// ═══════════════════════════════════════════════════════════════

export type InsightType =
  | 'pattern'         // ⚡ Something Pulse noticed
  | 'opportunity'     // 💡 Something Pulse found
  | 'risk'            // ⚠️ Something Pulse flagged
  | 'connection';     // 🔗 Cross-domain insight

export type ActionType =
  | 'completed'       // ✓ Pulse finished something
  | 'working'         // ◐ Pulse is processing
  | 'monitoring';     // 👁 Pulse is watching

export type MemoryType =
  | 'commitment'      // 📌 Something you promised
  | 'date'            // 📅 Important upcoming date
  | 'preference';     // 💭 Something Pulse learned about you

export interface PulseInsight {
  id: string;
  type: InsightType;
  content: string;                  // The insight itself
  implication: string;              // What it means for action
  source?: string;                  // Where Pulse learned this
  relatedThreads?: string[];        // Connected life threads
  createdAt: Date;
}

export interface PulseAction {
  id: string;
  type: ActionType;
  content: string;                  // "Drafted 3 follow-up emails"
  detail?: string;                  // "For contacts going cold"
  action?: {
    label: string;                  // "Review"
    path: string;
  };
  progress?: number;                // For 'working' type
  createdAt: Date;
}

export interface PulseMemory {
  id: string;
  type: MemoryType;
  content: string;                  // "You told Mike you'd send decision by Friday"
  dueAt?: Date;
  relatedTo?: string;               // Person, thread, or domain
  createdAt: Date;
}

export interface PulseMindState {
  isOnline: boolean;
  confidence: number;               // Life model confidence 0-100
  threadsMonitored: number;
  lastSync: Date;

  seeing: PulseInsight[];           // Patterns, opportunities, risks
  doing: PulseAction[];             // Completed, working, monitoring
  remembering: PulseMemory[];       // Commitments, dates, preferences

  // Meta
  itemsHandledAutonomously: number; // "Pulse is handling 14 other items"
}

// ═══════════════════════════════════════════════════════════════
// TIME HORIZON (Trajectory Visualization)
// ═══════════════════════════════════════════════════════════════

export interface DayLoad {
  date: Date;
  load: number;                     // 0-100
  status: 'clear' | 'normal' | 'heavy' | 'overload';
  keyItems: string[];               // What's creating the load
}

export interface TimeConflict {
  date: Date;
  description: string;              // "Triple-booked 2-4pm"
  suggestion?: string;              // "Move vendor call to Friday"
  actionPath?: string;
}

export interface TimeOpportunity {
  date: Date;
  type: 'deep_work' | 'recovery' | 'relationship' | 'open';
  duration: string;                 // "4 hours"
  suggestion?: string;              // "Best use: Finish Thompson proposal"
}

export interface TimeHorizonState {
  // 15-day view: 7 past + today + 7 future
  days: DayLoad[];

  // AI-generated insights
  conflicts: TimeConflict[];
  opportunities: TimeOpportunity[];

  // Summary
  pastWeekSummary: string;          // "Heavy week, recovery debt building"
  todayStatus: string;              // "Tonight: Clear"
  forecastSummary: string;          // "Thursday will be compressed"
}
