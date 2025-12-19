// lib/crm/intel-schema.ts

export type IntelSourceRow = {
  id?: string;
  contact_id?: string;
  owner_user_id?: string;

  // common variants across schema versions
  source_type?: string | null;
  type?: string | null;
  kind?: string | null;

  content?: string | null;
  raw_content?: string | null;
  text?: string | null;
  summary?: string | null;
  payload?: any;

  captured_at?: string | null;
  created_at?: string | null;
  inserted_at?: string | null;
};

export function looksLikeMissingColumn(message: string | undefined, col: string) {
  if (!message) return false;
  const m = message.toLowerCase();
  const c = col.toLowerCase();
  // Postgres/Supabase common variants
  return (
    m.includes(`column`) &&
    m.includes(c) &&
    (m.includes(`does not exist`) || m.includes(`not found`) || m.includes(`unknown column`))
  );
}

export function safeSourceType(s: IntelSourceRow): string {
  const t =
    s.source_type ??
    s.type ??
    s.kind ??
    (s.payload && (s.payload.source_type || s.payload.type || s.payload.kind)) ??
    null;

  if (!t) return "unknown";
  return String(t);
}

export function pickContent(s: IntelSourceRow): string {
  const c =
    s.content ??
    s.raw_content ??
    s.text ??
    s.summary ??
    (s.payload && (s.payload.content || s.payload.text || s.payload.summary)) ??
    "";

  return typeof c === "string" ? c : JSON.stringify(c);
}

export function pickCapturedAt(s: IntelSourceRow): string | null {
  const dt = s.captured_at ?? s.created_at ?? s.inserted_at ?? null;
  return dt ? String(dt) : null;
}
