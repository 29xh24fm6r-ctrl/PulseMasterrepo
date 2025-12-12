import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'chapter';

  // Temporary stub — prevents JSON errors
  return NextResponse.json({
    type,
    chapters: [],
    metrics: [],
    message: "Longitudinal endpoint stubbed. No data yet, but API is alive.",
  });
}
