export const runtime = "nodejs";

export async function GET() {
  // Later: read plugins from Supabase table
  return Response.json({ ok: true, plugins: [] }, { status: 200 });
}

