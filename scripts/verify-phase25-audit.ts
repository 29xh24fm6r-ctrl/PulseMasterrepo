
import { explainAutonomyDecision } from '../lib/brain/audit/explainAutonomyDecision';
import { PulseEffect } from '../lib/brain/writeAuthority/types';
import { AutonomyClass } from '../lib/brain/autonomy/types';
import { _setMockClass } from '../lib/brain/autonomy/decideAutonomyLevel';
import { attemptRecovery } from '../lib/brain/autonomy/attemptRecovery';
import { deriveContextHash, getCurrentContext } from '../lib/brain/autonomy/contextFingerprint';
import { classifyPulseEffect } from '../lib/brain/autonomy/classifyEffect';

// Mock Browser Environment
// @ts-ignore
Object.defineProperty(global, 'navigator', {
    value: { onLine: true, userAgent: 'Bot' },
    writable: true,
    configurable: true
});
// @ts-ignore
global.window = { location: { reload: () => { }, href: '' }, localStorage: { getItem: () => null } };

async function main() {
    console.log("🔍 Verifying Phase 25 (Autonomy Audit)...");

    const currentContextHash = deriveContextHash(getCurrentContext());


    // Base Effect
    const effect: PulseEffect = {
        domain: 'tasks',
        effectType: 'create',
        payload: { title: 'Audit Test', status: 'pending' },
        confidence: 0.9,
        source: 'audit_check'
    };

    const { classKey: derivedKey } = classifyPulseEffect(effect);
    console.log(`Debug: Derived Key: ${derivedKey}`);
    const classKey = derivedKey;

    // 1. Explain Healthy L1
    console.log("\n🧪 Test 1: Explain Healthy L1");
    const healthyClass: AutonomyClass = {
        classKey,
        domain: 'tasks',
        effectType: 'create',
        fingerprint: 'test',
        status: 'eligible',
        eligibilityScore: 1.0,
        stats: { successes: 50, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 },
        user_paused: false,
        decay_score: 0,
        context_hash: currentContextHash,
        health_state: 'healthy',
        recovery_attempts: 0
    };
    _setMockClass(classKey, healthyClass);

    const expl1 = explainAutonomyDecision(effect, healthyClass);
    if (expl1.autonomyLevel !== 'L1') throw new Error("Expected L1 explanation");
    if (!expl1.summary.includes("executed this autonomously")) throw new Error("Summary should indicate autonomous execution");
    console.log("✅ L1 Explanation Correct");


    // 2. Explain Context Drift
    console.log("\n🧪 Test 2: Explain Context Drift");
    const driftedClass = { ...healthyClass, context_hash: 'different_context' };
    _setMockClass(classKey, driftedClass); // Update decision engine state

    const expl2 = explainAutonomyDecision(effect, driftedClass);
    if (expl2.autonomyLevel !== 'L0') throw new Error("Expected L0 explanation");
    if (!expl2.safeguardsApplied.includes("Context Drift Protection (Phase 23)")) throw new Error("Should mention Context Drift");
    console.log("✅ Drift Explanation Correct");


    // 3. Explain Locked State
    console.log("\n🧪 Test 3: Explain Locked State");
    const lockedClass: AutonomyClass = { ...healthyClass, health_state: 'locked' };
    _setMockClass(classKey, lockedClass);

    const expl3 = explainAutonomyDecision(effect, lockedClass);
    if (expl3.autonomyLevel !== 'L0') throw new Error("Expected L0 (Locked)");
    if (!expl3.summary.includes("currently LOCKED")) throw new Error("Summary should mention LOCK");
    console.log("✅ Locked Explanation Correct");

    console.log("\n🎯 Phase 25 Verification Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
