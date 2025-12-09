import { NextRequest, NextResponse } from "next/server";

// Server-side autonomy check
// In production, this would read from database/user settings
// For now, we pass settings from client or use defaults

export type AutonomyLevel = "jarvis" | "copilot" | "advisor" | "zen";

export type AutonomyCheckRequest = {
  domain: "tasks" | "email" | "deals" | "relationships" | "calendar" | "habits" | "journal" | "notifications";
  action: "auto_execute" | "suggest" | "notify";
  isHighStakes?: boolean;
  isCritical?: boolean;
  settings?: {
    globalLevel: AutonomyLevel;
    useDomainOverrides: boolean;
    domains: Record<string, AutonomyLevel>;
    quietHours: { enabled: boolean; start: string; end: string };
    proactiveInsights: boolean;
    criticalOnly: boolean;
  };
};

export type AutonomyCheckResponse = {
  allowed: boolean;
  level: AutonomyLevel;
  reason: string;
  suggestion?: string;
};

const DEFAULT_LEVEL: AutonomyLevel = "jarvis";

function isInQuietHours(quietHours: { enabled: boolean; start: string; end: string }): boolean {
  if (!quietHours.enabled) return false;
  
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const [startH, startM] = quietHours.start.split(":").map(Number);
  const [endH, endM] = quietHours.end.split(":").map(Number);
  
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  
  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

export async function POST(req: NextRequest) {
  try {
    const body: AutonomyCheckRequest = await req.json();
    const { domain, action, isHighStakes = false, isCritical = false, settings } = body;

    // Use provided settings or defaults
    const globalLevel = settings?.globalLevel || DEFAULT_LEVEL;
    const useDomainOverrides = settings?.useDomainOverrides || false;
    const domainLevel = useDomainOverrides && settings?.domains?.[domain] 
      ? settings.domains[domain] 
      : globalLevel;
    
    const quietHours = settings?.quietHours || { enabled: false, start: "22:00", end: "07:00" };
    const proactiveInsights = settings?.proactiveInsights ?? true;
    const criticalOnly = settings?.criticalOnly ?? false;

    let allowed = false;
    let reason = "";
    let suggestion: string | undefined = undefined;

    // Check quiet hours first
    if (isInQuietHours(quietHours) && !isCritical) {
      return NextResponse.json({
        allowed: false,
        level: domainLevel,
        reason: "Currently in quiet hours",
        suggestion: "This action will be queued until quiet hours end",
      } as AutonomyCheckResponse);
    }

    // Check based on action type
    switch (action) {
      case "auto_execute":
        switch (domainLevel) {
          case "jarvis":
            allowed = true;
            reason = "Jarvis mode: full automation enabled";
            break;
          case "copilot":
            allowed = !isHighStakes;
            reason = isHighStakes 
              ? "Co-pilot mode: high-stakes action requires confirmation" 
              : "Co-pilot mode: routine action auto-approved";
            if (isHighStakes) {
              suggestion = "Ask user for confirmation before proceeding";
            }
            break;
          case "advisor":
            allowed = false;
            reason = "Advisor mode: user confirmation required";
            suggestion = "Present suggestion to user for approval";
            break;
          case "zen":
            allowed = false;
            reason = "Zen mode: no automatic actions";
            suggestion = "Wait for user to initiate this action";
            break;
        }
        break;

      case "suggest":
        if (criticalOnly && !isCritical) {
          allowed = false;
          reason = "Critical-only mode active";
        } else if (!proactiveInsights) {
          allowed = false;
          reason = "Proactive insights disabled";
        } else {
          allowed = domainLevel !== "zen";
          reason = domainLevel === "zen" 
            ? "Zen mode: no proactive suggestions" 
            : "Suggestions allowed";
        }
        break;

      case "notify":
        if (isCritical && domainLevel !== "zen") {
          allowed = true;
          reason = "Critical notification: always allowed (except zen mode)";
        } else if (criticalOnly) {
          allowed = isCritical;
          reason = isCritical ? "Critical notification allowed" : "Non-critical notification blocked";
        } else if (!proactiveInsights) {
          allowed = isCritical;
          reason = "Proactive insights disabled; only critical notifications allowed";
        } else {
          allowed = domainLevel !== "zen";
          reason = domainLevel === "zen" 
            ? "Zen mode: notifications disabled" 
            : "Notifications allowed";
        }
        break;
    }

    const response: AutonomyCheckResponse = {
      allowed,
      level: domainLevel,
      reason,
    };

    if (suggestion) {
      response.suggestion = suggestion;
    }

    return NextResponse.json(response);

  } catch (error: any) {
    console.error("Autonomy check error:", error);
    return NextResponse.json(
      { error: "Failed to check autonomy", details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve current autonomy summary
export async function GET() {
  return NextResponse.json({
    defaultLevel: "jarvis",
    levels: {
      jarvis: {
        name: "Jarvis Mode",
        autoExecute: true,
        askHighStakes: false,
        suggestions: true,
        notifications: true,
      },
      copilot: {
        name: "Co-Pilot Mode",
        autoExecute: true,
        askHighStakes: true,
        suggestions: true,
        notifications: true,
      },
      advisor: {
        name: "Advisor Mode",
        autoExecute: false,
        askHighStakes: true,
        suggestions: true,
        notifications: true,
      },
      zen: {
        name: "Zen Mode",
        autoExecute: false,
        askHighStakes: false,
        suggestions: false,
        notifications: false,
      },
    },
  });
}