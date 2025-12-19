// Master Brain - Latest Diagnostics API
// app/api/masterbrain/diagnostics/latest/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: latestRun } = await supabaseAdmin
      .from('system_diagnostics_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latestRun) {
      return NextResponse.json({ run: null, findings: [] });
    }

    const { data: findings } = await supabaseAdmin
      .from('system_diagnostics_findings')
      .select('*, system_modules(*)')
      .eq('run_id', latestRun.id)
      .order('severity', { ascending: false })
      .order('created_at', { ascending: false });

    return NextResponse.json({
      run: latestRun,
      findings: findings ?? [],
    });
  } catch (err) {
    console.error('[API] Master Brain latest diagnostics fetch failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch latest diagnostics' },
      { status: 500 }
    );
  }
}


