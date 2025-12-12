// app/api/longitudinal/route.ts
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'chapter';

  // TODO: hook this into the real longitudinal engine.
  // For now, return a safe stub so the frontend always gets valid JSON.
  return NextResponse.json({
    type,
    chapters: [],
    metrics: [],
    message: 'Longitudinal endpoint stubbed. No data yet, but API is alive.',
  });
}

