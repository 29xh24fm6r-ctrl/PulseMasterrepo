// Memory Civilization Layer - Pattern Feeder
// lib/civilization/memory_patterns.ts

import { supabaseAdmin } from '@/lib/supabase';

export async function seedDefaultPatterns(): Promise<void> {
  const patterns = [
    {
      domain: 'focus',
      key: 'weekly_review_helps_overwhelm',
      title: 'Weekly Review Reduces Overwhelm',
      description_md: 'Users who adopted weekly planning and review rituals during periods of high overwhelm saw improvements in focus and task completion.',
      pattern: {
        if: {
          context: 'high_overwhelm',
          intervention: 'weekly_planning_plus_review',
        },
        then: {
          metric: 'daily_focus_score',
          change: '+12%',
        },
        confidence: 0.74,
      },
      stats: {
        sample_size: 342,
        effect_size: 0.18,
        p_value: 0.01,
      },
    },
    {
      domain: 'communication',
      key: 'pre_call_warmup_improves_quality',
      title: 'Pre-Call Warmup Improves Communication Quality',
      description_md: 'Users who did communication drills before important calls saw measurable improvements in call quality scores.',
      pattern: {
        if: {
          context: 'important_call',
          intervention: 'pre_call_warmup',
        },
        then: {
          metric: 'communication_quality_score',
          change: '+15%',
        },
        confidence: 0.68,
      },
      stats: {
        sample_size: 189,
        effect_size: 0.22,
        p_value: 0.02,
      },
    },
  ];

  for (const pattern of patterns) {
    await supabaseAdmin
      .from('civilization_patterns')
      .upsert(pattern, { onConflict: 'domain,key' });
  }
}


