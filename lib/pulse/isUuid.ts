// lib/pulse/isUuid.ts
export function isUuid(v: string) {
  // UUID v4-ish, good enough for gating dev ids safely
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

