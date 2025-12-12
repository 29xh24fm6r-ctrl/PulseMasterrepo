// AGI Kernel v2 Safety Rails
// lib/agi_kernel/v2/safety.ts

export interface SafetyEvaluation {
  autonomyLevel: 'auto_safe' | 'needs_confirmation' | 'coach_review';
  safetyRisk: number;       // 0..1
  notes?: string[];
}

export function evaluateUpdateSafety(
  targetSystem: string,
  actionKind: string,
  payload: any
): SafetyEvaluation {
  // Hard constraints: certain systems always need confirmation
  const alwaysConfirmTargets = new Set([
    'identity', 'destiny', 'financial_core', 'legal', 'sba_lending', 'compliance'
  ]);

  const highRiskActions = new Set([
    'delete_data', 'cancel_major_commitment', 'modify_contract', 'modify_deal_terms'
  ]);

  // Default
  let level: SafetyEvaluation['autonomyLevel'] = 'auto_safe';
  let risk = 0.2;
  const notes: string[] = [];

  if (alwaysConfirmTargets.has(targetSystem)) {
    level = 'needs_confirmation';
    risk = Math.max(risk, 0.6);
    notes.push('Target system is protected; requires user or coach confirmation.');
  }

  if (highRiskActions.has(actionKind)) {
    level = 'coach_review';
    risk = Math.max(risk, 0.8);
    notes.push('High impact action; require Confidant/Advisor coach review.');
  }

  // Optionally inspect payload for more signals
  if (payload && typeof payload === 'object') {
    // Check for financial amounts
    if (payload.amount && Math.abs(Number(payload.amount)) > 1000) {
      level = 'needs_confirmation';
      risk = Math.max(risk, 0.7);
      notes.push('Large financial amount detected; requires confirmation.');
    }

    // Check for data deletion
    if (payload.delete || payload.remove || payload.cancel) {
      level = 'needs_confirmation';
      risk = Math.max(risk, 0.6);
      notes.push('Action involves deletion/removal; requires confirmation.');
    }
  }

  return { autonomyLevel: level, safetyRisk: risk, notes };
}


