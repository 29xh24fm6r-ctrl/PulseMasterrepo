import "server-only";
import { z, ZodTypeAny } from "zod";

export type Contract<Req extends ZodTypeAny | null, Res extends ZodTypeAny> = {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  req: Req; // null for no body
  res: Res;
};

/**
 * Parse and validate JSON request body against a Zod schema
 */
export async function parseJsonBody<T extends ZodTypeAny>(
  req: Request,
  schema: T
): Promise<z.infer<T>> {
  const raw = await req.json().catch(() => ({}));
  return schema.parse(raw);
}

/**
 * Return a successful JSON response
 */
export function jsonOk(data: unknown, init?: ResponseInit) {
  return Response.json({ ok: true, ...(typeof data === "object" && data !== null ? data : { data }) }, init);
}

/**
 * Return an error JSON response
 */
export function jsonErr(error: string, init?: ResponseInit) {
  return Response.json({ ok: false, error }, init ?? { status: 400 });
}

/**
 * Validates response payload in dev/test. In prod we keep it lightweight.
 * Toggle with env var if you want strict prod checking later.
 */
export function validateResponse<T extends ZodTypeAny>(
  schema: T,
  payload: unknown
): z.infer<T> {
  // In production, skip validation for performance (can be toggled with env var)
  if (process.env.NODE_ENV === "production" && !process.env.ENABLE_STRICT_CONTRACTS) {
    return payload as z.infer<T>;
  }
  
  // In dev/test, validate strictly
  return schema.parse(payload);
}

