import { NextRequest, NextResponse } from "next/server";

// In-memory session store (in production, use Redis or similar)
// Key: sessionId, Value: context
const sessionStore = new Map<string, CoachContext>();

interface PersonContext {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  type?: string;
  relationshipStatus?: string;
  lastContact?: string;
  notes?: string;
  rawData?: string;
}

interface CoachInsight {
  coachId: string;
  coachName: string;
  insight: string;
  action?: string;
  timestamp: string;
}

interface CoachContext {
  sessionId: string;
  createdAt: string;
  updatedAt: string;
  // Current person being discussed
  activePerson?: PersonContext;
  // History of coach insights this session
  coachInsights: CoachInsight[];
  // Topic/situation being discussed
  situation?: string;
  // Tags for context
  tags: string[];
}

// Generate session ID (in production, use proper session management)
function getSessionId(request: NextRequest): string {
  // Try to get from header or generate based on timestamp
  const headerSession = request.headers.get('x-pulse-session');
  if (headerSession) return headerSession;
  
  // Use a daily session ID for simplicity
  const today = new Date().toISOString().split('T')[0];
  return `session-${today}`;
}

// Clean up old sessions (older than 24 hours)
function cleanupSessions() {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  for (const [key, context] of sessionStore.entries()) {
    const createdAt = new Date(context.createdAt).getTime();
    if (now - createdAt > dayMs) {
      sessionStore.delete(key);
    }
  }
}

/**
 * GET - Retrieve current coach context
 */
export async function GET(request: NextRequest) {
  cleanupSessions();
  
  const sessionId = getSessionId(request);
  const context = sessionStore.get(sessionId);
  
  if (!context) {
    return NextResponse.json({
      ok: true,
      context: null,
      message: "No active context",
    });
  }
  
  return NextResponse.json({
    ok: true,
    context,
  });
}

/**
 * POST - Update coach context
 * 
 * Actions:
 * - setPerson: Set the active person being discussed
 * - clearPerson: Clear active person
 * - addInsight: Add a coach insight to history
 * - setSituation: Set the current situation/topic
 * - addTag: Add a context tag
 * - clear: Clear entire context
 */
export async function POST(request: NextRequest) {
  cleanupSessions();
  
  try {
    const sessionId = getSessionId(request);
    const body = await request.json();
    const { action, data } = body;
    
    // Get or create context
    let context = sessionStore.get(sessionId);
    if (!context) {
      context = {
        sessionId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        coachInsights: [],
        tags: [],
      };
    }
    
    // Handle actions
    switch (action) {
      case 'setPerson':
        context.activePerson = data as PersonContext;
        break;
        
      case 'clearPerson':
        context.activePerson = undefined;
        break;
        
      case 'addInsight':
        const insight: CoachInsight = {
          coachId: data.coachId,
          coachName: data.coachName,
          insight: data.insight,
          action: data.action,
          timestamp: new Date().toISOString(),
        };
        context.coachInsights.push(insight);
        // Keep only last 10 insights
        if (context.coachInsights.length > 10) {
          context.coachInsights = context.coachInsights.slice(-10);
        }
        break;
        
      case 'setSituation':
        context.situation = data.situation;
        break;
        
      case 'addTag':
        if (!context.tags.includes(data.tag)) {
          context.tags.push(data.tag);
        }
        break;
        
      case 'clear':
        context = {
          sessionId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          coachInsights: [],
          tags: [],
        };
        break;
        
      default:
        return NextResponse.json(
          { ok: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
    
    context.updatedAt = new Date().toISOString();
    sessionStore.set(sessionId, context);
    
    return NextResponse.json({
      ok: true,
      context,
    });
    
  } catch (error: any) {
    console.error("Coach context error:", error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
