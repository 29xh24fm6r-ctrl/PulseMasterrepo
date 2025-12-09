// ============================================================================
// PULSE A.C.D. — Onboarding Interview Questions
// ============================================================================

import { InterviewQuestion } from "@/types/dashboard";

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  // COGNITIVE
  {
    id: "overwhelm_tasks",
    category: "COGNITIVE",
    question: "Do you get overwhelmed when you see too many tasks at once?",
    type: "YES_NO",
  },
  {
    id: "single_vs_list",
    category: "COGNITIVE",
    question: "Would you rather see just one next action or a full list?",
    type: "CHOICE",
    options: ["ONE", "LIST"],
  },
  {
    id: "app_switching",
    category: "COGNITIVE",
    question: "Do you often jump between apps and lose track?",
    type: "CHOICE",
    options: ["RARELY", "SOMETIMES", "OFTEN"],
  },
  {
    id: "dashboard_style",
    category: "COGNITIVE",
    question: "Would you like a calm, minimal dashboard or something more energetic?",
    type: "CHOICE",
    options: ["CALM", "IN_BETWEEN", "ENERGETIC"],
  },
  // PROFESSIONAL
  {
    id: "work_type",
    category: "PROFESSIONAL",
    question: "What best describes your work?",
    type: "CHOICE",
    options: ["SALES", "MANAGER", "IC", "CREATOR", "OTHER"],
  },
  {
    id: "daily_actions",
    category: "PROFESSIONAL",
    question: "What 3 things do you do most days?",
    type: "FREE_TEXT",
  },
  {
    id: "primary_management",
    category: "PROFESSIONAL",
    question: "Do you mainly manage deals, projects, clients, or something else?",
    type: "CHOICE",
    options: ["DEALS", "PROJECTS", "CLIENTS", "OTHER"],
  },
  {
    id: "relationship_importance",
    category: "PROFESSIONAL",
    question: "How important is relationship management in your work?",
    type: "SCALE",
    scale: { min: 1, max: 5 },
  },
  // MOTIVATION
  {
    id: "xp_motivation",
    category: "MOTIVATION",
    question: "Does seeing XP bars and progress numbers motivate you?",
    type: "YES_NO",
  },
  {
    id: "celebrations",
    category: "MOTIVATION",
    question: "Would you like Pulse to celebrate your wins with sounds and animations?",
    type: "YES_NO",
  },
  {
    id: "tone_preference",
    category: "MOTIVATION",
    question: "What kind of tone do you prefer?",
    type: "CHOICE",
    options: ["SENSEI", "COACH", "CALM_ASSISTANT", "HYPE"],
  },
  {
    id: "push_intensity",
    category: "MOTIVATION",
    question: "Would you like Pulse to push you gently or hard?",
    type: "SCALE",
    scale: { min: 1, max: 5 },
  },
];

export const TOTAL_QUESTIONS = INTERVIEW_QUESTIONS.length;
