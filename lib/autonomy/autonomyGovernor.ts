
import { DecisionIntent } from '../brain/types';
import { supabaseAdmin } from '../supabase';
import { AutonomyDecision, AutonomyDomain, AutonomyLevel, AUTONOMY_LEVELS_ORDER } from './types';
import { assertMetaVerified } from '../canon/invariants';

/**
 * Autonomy Governor
 * =================
 * 
 * The Single Authority that decides if the Pulse Brain is allowed to act autonomously.
 * 
 * Rules:
 * 1. Default DENY.
 * 2. Must be Autonomy Eligible (Canon Status).
 * 3. Must have valid Trust Hash.
 * 4. Must not have Escalation.
 * 5. Must strictly follow Domain Configuration.
 */

export class AutonomyGovernor {

    /**
     * Evaluates whether autonomy is allowed for the given intent.
     */
    async evaluateAutonomy(
        userId: string,
        intent: DecisionIntent,
        conf: { domain?: AutonomyDomain } = {}
    ): Promise<AutonomyDecision> {
        const domain = conf.domain || 'general';

        // 1. Hard Invariant Check
        try {
            assertMetaVerified(intent);
        } catch (e: any) {
            return this.deny(`Invariant Failure: ${e.message}`);
        }

        // 2. Check Canon Status (System-wide Kill Switch)
        const { data: canon, error: canonErr } = await supabaseAdmin
            .from('brain_canon_status')
            .select('autonomy_eligible')
            .eq('owner_user_id', userId)
            .single();

        if (canonErr || !canon?.autonomy_eligible) {
            return this.deny("System not eligible for autonomy (Canon Flag False).");
        }

        // 3. Check Escalation (If brain is uncertain, autonomy is revoked)
        if (intent.escalation_level && intent.escalation_level !== 'none') {
            return this.deny(`Autonomy revoked due to escalation: ${intent.escalation_level}`);
        }

        // 4. Fetch Domain Config
        const { data: config, error: configErr } = await supabaseAdmin
            .from('autonomy_domain_config')
            .select('current_level, confidence_threshold, is_enabled')
            .eq('owner_user_id', userId)
            .eq('domain', domain)
            .single();

        // Default to L0 if no config found
        const currentLevel: AutonomyLevel = config?.current_level || 'L0';
        const isEnabled = config ? config.is_enabled : true; // Default true (for L0)
        const threshold = config?.confidence_threshold || 0.8;

        if (!isEnabled) {
            return this.deny("Autonomy disabled for this domain.");
        }

        // 5. Check Confidence vs Threshold
        if ((intent.meta_confidence || 0) < threshold) {
            // Downgrade logic: If L1 requested but confidence low, drop to L0 (Observational)
            // But if L2+, drop to L1? Spec says L2->L1->L0.
            // For now, if confidence is low, we force L0 (Observe Only)
            return this.allow('L0', [`Confidence ${intent.meta_confidence} < Threshold ${threshold}`]);
        }

        // 6. Grant Autonomy at Configured Level
        return this.allow(currentLevel, [`Authorized for ${domain}`]);
    }

    private deny(reason: string): AutonomyDecision {
        return {
            allowed: false,
            level: 'L0', // Effectively observed only (or ignored)
            constraints: [],
            reason
        };
    }

    private allow(level: AutonomyLevel, constraints: string[] = []): AutonomyDecision {
        return {
            allowed: true,
            level,
            constraints,
            reason: "Policy Check Passed"
        };
    }
}

export const autonomyGovernor = new AutonomyGovernor();
