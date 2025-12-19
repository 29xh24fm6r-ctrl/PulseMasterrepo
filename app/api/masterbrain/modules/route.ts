// Master Brain - Modules API
// app/api/masterbrain/modules/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { listSystemModules } from '@/lib/masterbrain/registry';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const modules = await listSystemModules();

    // Get latest health for each module
    const moduleIds = modules.map((m) => m.id);
    const { data: healthRecords } = await supabaseAdmin
      .from('system_module_health')
      .select('*, system_modules(*)')
      .in('module_id', moduleIds)
      .order('last_check_at', { ascending: false });

    // Get recent metrics (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().slice(0, 10);

    const { data: recentMetrics } = await supabaseAdmin
      .from('system_module_metrics')
      .select('*, system_modules(*)')
      .in('module_id', moduleIds)
      .gte('date', sevenDaysAgoStr)
      .order('date', { ascending: false });

    // Combine data
    const modulesWithHealth = modules.map((module) => {
      const health = healthRecords?.find((h: any) => h.module_id === module.id);
      const metrics = recentMetrics?.filter((m: any) => m.module_id === module.id) ?? [];
      const totalInvocations = metrics.reduce((sum, m) => sum + (m.invocation_count ?? 0), 0);

      return {
        ...module,
        health: health
          ? {
              status: health.status,
              status_reason: health.status_reason,
              last_check_at: health.last_check_at,
            }
          : null,
        metrics: {
          invocations_7d: totalInvocations,
          last_invocation: metrics[0]?.last_invocation_at ?? null,
        },
      };
    });

    return NextResponse.json({ modules: modulesWithHealth });
  } catch (err) {
    console.error('[API] Master Brain modules fetch failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch modules' },
      { status: 500 }
    );
  }
}


