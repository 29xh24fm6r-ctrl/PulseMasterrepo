export const runtime = "nodejs";

export async function GET() {
  // Later: read scenarios from Supabase table
  return Response.json({ ok: true, scenarios: [] }, { status: 200 });
}

