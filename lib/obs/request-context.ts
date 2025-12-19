import "server-only";
import { headers } from "next/headers";
import crypto from "node:crypto";

export function getRequestId(): string {
  const h = headers();
  const existing = h.get("x-request-id");
  return existing || crypto.randomUUID();
}

export function getRequestMeta() {
  const h = headers();
  return {
    requestId: getRequestId(),
    userAgent: h.get("user-agent") || undefined,
    referer: h.get("referer") || undefined,
  };
}

