export const runtime = "nodejs";

export async function GET() {
  return Response.json(
    { ok: true, status: "alive", db: "supabase" },
    { status: 200 }
  );
}

