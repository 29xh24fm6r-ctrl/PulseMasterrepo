/**
 * Standardized API route error responses
 */

export function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

export function jsonOk<T>(data: T) {
  return Response.json({ ok: true, data });
}

/**
 * Handle async route errors consistently
 */
export function handleRouteError(error: unknown): Response {
  if (error instanceof Error) {
    // Hide internal errors in production
    const message = process.env.NODE_ENV === "development" 
      ? error.message 
      : "Internal server error";
    return jsonError(message, 500);
  }
  return jsonError("An unexpected error occurred", 500);
}

