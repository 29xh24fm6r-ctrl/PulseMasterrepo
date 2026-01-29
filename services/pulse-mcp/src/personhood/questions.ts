// personhood/questions.ts
// Question governance — strict rules for when and how Pulse asks questions.
//
// Rules:
//   - Never stack questions
//   - Never ask what can be inferred
//   - Prefer binary or constrained questions
//   - Ask ≤ 1 question per turn
//
// Good:  "Mobile first?"
// Bad:   "Can you tell me more about what you're trying to achieve?"

import type { TastePreferences } from "./types.js";

interface QuestionAnalysis {
  count: number;
  questions: string[];
  violations: string[];
}

/**
 * Analyze text for question governance violations.
 */
export function analyzeQuestions(text: string): QuestionAnalysis {
  const questions: string[] = [];
  const violations: string[] = [];

  // Find all sentences ending with ?
  const sentences = text.split(/(?<=[.!?])\s+/);
  for (const s of sentences) {
    if (s.trim().endsWith("?")) {
      questions.push(s.trim());
    }
  }

  // Rule: ≤ 1 question per turn
  if (questions.length > 1) {
    violations.push(
      `stacked_questions: ${questions.length} questions found (max 1)`,
    );
  }

  // Rule: No open-ended probing questions
  for (const q of questions) {
    const lower = q.toLowerCase();
    if (
      lower.includes("tell me more") ||
      lower.includes("how do you feel") ||
      lower.includes("what are you hoping") ||
      lower.includes("can you elaborate") ||
      lower.includes("what do you think about") ||
      lower.includes("could you explain")
    ) {
      violations.push(`open_ended_probe: "${q.slice(0, 60)}"`);
    }
  }

  return { count: questions.length, questions, violations };
}

/**
 * Enforce question governance on text.
 * If multiple questions found, keeps only the last one (most specific).
 * Returns the governed text.
 */
export function governQuestions(
  text: string,
  preferences: TastePreferences,
): string {
  // If user prefers minimal questions, strip all questions
  if (preferences.question_rate === "minimal") {
    return text.replace(/[^.!]\?/g, ".").replace(/\?\s*$/, ".");
  }

  const analysis = analyzeQuestions(text);
  if (analysis.count <= 1) return text;

  // Keep only the last question, convert others to statements
  let result = text;
  const toRemove = analysis.questions.slice(0, -1);
  for (const q of toRemove) {
    // Convert question to statement by removing the question mark
    const statement = q.replace(/\?\s*$/, ".");
    result = result.replace(q, statement);
  }

  return result;
}

/**
 * Generate a constrained question from an open-ended one.
 * If the question is already constrained, returns it unchanged.
 */
export function constrainQuestion(question: string): string {
  const lower = question.toLowerCase();

  // Already binary/constrained
  if (
    lower.startsWith("should") ||
    lower.startsWith("do you want") ||
    lower.startsWith("want") ||
    lower.includes("or") ||
    question.split(" ").length <= 5
  ) {
    return question;
  }

  // Try to shorten
  // "Would you like me to add historical comparison?" → "Add historical comparison?"
  const shortened = question
    .replace(/^would you like (me to )?/i, "")
    .replace(/^do you want (me to )?/i, "")
    .replace(/^shall (I|we) /i, "")
    .replace(/^should (I|we) /i, "");

  if (shortened.length < question.length) {
    return shortened.charAt(0).toUpperCase() + shortened.slice(1);
  }

  return question;
}
