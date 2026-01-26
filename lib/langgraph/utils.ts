// lib/langgraph/utils.ts
// Safe utility functions for LangGraph state management

/**
 * Safely merge two values, returning `a` if `b` is undefined/null
 */
export function safeMerge<T>(a: T, b: T | undefined | null): T {
  return (b ?? a) as T;
}

/**
 * Safely append arrays, returning `a` if `b` is undefined/null/empty
 */
export function safeAppend<T>(a: T[], b: T[] | undefined | null): T[] {
  if (!b || b.length === 0) return a;
  return [...a, ...b];
}

/**
 * Best-effort JSON extraction from LLM output.
 * Handles markdown code blocks, leading/trailing text, and other common issues.
 */
export function parseJsonObject<T = any>(raw: unknown): T {
  const text = typeof raw === "string" ? raw : JSON.stringify(raw);
  const trimmed = text.trim();

  // First try direct parse
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    // Continue to extraction attempts
  }

  // Try removing markdown code blocks
  const withoutMarkdown = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(withoutMarkdown) as T;
  } catch {
    // Continue to extraction attempts
  }

  // Try extracting the first {...} block
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const candidate = trimmed.slice(start, end + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Fall through to error
    }
  }

  // Try extracting the first [...] block (for arrays)
  const arrStart = trimmed.indexOf("[");
  const arrEnd = trimmed.lastIndexOf("]");
  if (arrStart >= 0 && arrEnd > arrStart) {
    const candidate = trimmed.slice(arrStart, arrEnd + 1);
    try {
      return JSON.parse(candidate) as T;
    } catch {
      // Fall through to error
    }
  }

  throw new Error(`Could not parse JSON from: ${trimmed.slice(0, 200)}...`);
}

/**
 * Safely parse JSON with a fallback value
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return parseJsonObject<T>(str);
  } catch {
    return fallback;
  }
}
