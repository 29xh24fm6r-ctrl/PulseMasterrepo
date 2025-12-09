// ============================================================================
// PULSE A.C.D. — Layout Generation Engine
// ============================================================================

import {
  LayoutJson,
  LayoutDensity,
  PanelKey,
  UserProfile,
  CognitiveProfile,
  ProfessionalIdentity,
  MotivationProfile,
} from "@/types/dashboard";

interface WidgetDef {
  key: string;
  label: string;
  defaultPriority: number;
  supportsPanel: PanelKey[];
  roleAffinity: string[];
  requiresGamification?: boolean;
  requiresRelationships?: boolean;
}

export const WIDGET_CATALOG: WidgetDef[] = [
  { key: "guidance_stream", label: "Guidance", defaultPriority: 1, supportsPanel: ["GUIDANCE"], roleAffinity: ["ALL"] },
  { key: "xp_summary", label: "XP Summary", defaultPriority: 5, supportsPanel: ["XP"], roleAffinity: ["ALL"], requiresGamification: true },
  { key: "career_track", label: "Career Track", defaultPriority: 10, supportsPanel: ["XP"], roleAffinity: ["ALL"], requiresGamification: true },
  { key: "philosophy_belt", label: "Philosophy Belt", defaultPriority: 15, supportsPanel: ["XP"], roleAffinity: ["ALL"], requiresGamification: true },
  { key: "tasks_quickview", label: "Tasks", defaultPriority: 20, supportsPanel: ["TOOLS"], roleAffinity: ["ALL"] },
  { key: "calendar_mini", label: "Calendar", defaultPriority: 25, supportsPanel: ["TOOLS"], roleAffinity: ["MANAGER", "SALES", "IC"] },
  { key: "focus_timer", label: "Focus Timer", defaultPriority: 30, supportsPanel: ["TOOLS"], roleAffinity: ["IC", "CREATOR"] },
  { key: "second_brain_shortcuts", label: "Second Brain", defaultPriority: 35, supportsPanel: ["TOOLS"], roleAffinity: ["SALES", "MANAGER"], requiresRelationships: true },
  { key: "call_notes_recent", label: "Call Notes", defaultPriority: 40, supportsPanel: ["TOOLS"], roleAffinity: ["SALES", "MANAGER"], requiresRelationships: true },
  { key: "coaches_entry", label: "AI Coaches", defaultPriority: 45, supportsPanel: ["TOOLS"], roleAffinity: ["ALL"] },
  { key: "oracle_shortcuts", label: "Oracle CRM", defaultPriority: 50, supportsPanel: ["TOOLS"], roleAffinity: ["SALES", "MANAGER"], requiresRelationships: true },
  { key: "followup_radar", label: "Follow-ups", defaultPriority: 55, supportsPanel: ["TOOLS"], roleAffinity: ["SALES"], requiresRelationships: true },
  { key: "tomorrow_preview", label: "Tomorrow", defaultPriority: 60, supportsPanel: ["TOOLS"], roleAffinity: ["ALL"] },
];

export function generateInitialLayout(profile: {
  cognitive_profile: CognitiveProfile;
  professional_identity: ProfessionalIdentity;
  motivation_profile: MotivationProfile;
}): LayoutJson {
  const { cognitive_profile, professional_identity, motivation_profile } = profile;

  // Determine density
  let density: LayoutDensity = "MEDIUM";
  if (cognitive_profile.hasAdhdLikeTraits || cognitive_profile.visualNoiseTolerance === "LOW") {
    density = "LOW";
  } else if (cognitive_profile.visualNoiseTolerance === "HIGH" && motivation_profile.likesGamification) {
    density = "HIGH";
  }

  const maxTools = density === "LOW" ? 4 : density === "MEDIUM" ? 6 : 8;

  // Filter eligible widgets
  const eligible = WIDGET_CATALOG.filter((w) => {
    if (w.requiresGamification && !motivation_profile.likesGamification) return false;
    if (w.requiresRelationships && professional_identity.relationshipIntensity < 3) return false;
    return true;
  });

  // Score and sort
  const scored = eligible.map((w) => {
    let score = 100 - w.defaultPriority;
    if (w.roleAffinity.includes("ALL") || w.roleAffinity.includes(professional_identity.primaryMode)) {
      score += 50;
    }
    return { widget: w, score };
  }).sort((a, b) => b.score - a.score);

  // Build panels
  const panels: LayoutJson["panels"] = {
    GUIDANCE: { widgets: ["guidance_stream"] },
    XP: { widgets: [] },
    TOOLS: { widgets: [] },
  };

  // XP panel
  if (motivation_profile.likesGamification) {
    panels.XP.widgets.push("xp_summary");
    if (professional_identity.primaryMode !== "OTHER") panels.XP.widgets.push("career_track");
    if (density !== "LOW") panels.XP.widgets.push("philosophy_belt");
  }

  // Tools panel
  panels.TOOLS.widgets = scored
    .filter((s) => s.widget.supportsPanel.includes("TOOLS"))
    .slice(0, maxTools)
    .map((s) => s.widget.key);

  return { panels, density };
}

export function createDefaultLayout(): LayoutJson {
  return {
    panels: {
      GUIDANCE: { widgets: ["guidance_stream"] },
      XP: { widgets: ["xp_summary", "career_track"] },
      TOOLS: { widgets: ["tasks_quickview", "calendar_mini", "coaches_entry", "second_brain_shortcuts"] },
    },
    density: "MEDIUM",
  };
}
