
import { executePulseEffect } from '../lib/brain/writeAuthority/executePulseEffect';
import { PulseEffect } from '../lib/brain/writeAuthority/types';
import { _setMockClass } from '../lib/brain/autonomy/decideAutonomyLevel';
import { MIN_SUCCESSES_FOR_ELIGIBLE, ELIGIBILITY_SCORE_FOR_L1 } from '../lib/brain/autonomy/eligibilityPolicy';

// Mock Browser Environment
// @ts-ignore
Object.defineProperty(global, 'navigator', {
    value: { onLine: true, userAgent: 'Bot' },
    writable: true,
    configurable: true
});
// @ts-ignore
global.window = {
    location: { reload: () => { }, href: '' },
    localStorage: { getItem: () => null },
    speechSynthesis: { cancel: () => { }, speak: () => { } }
};
// @ts-ignore
global.SpeechSynthesisUtterance = class { };

async function main() {
    console.log("🔍 Verifying Phase 20 (Multi-Domain L1)...");

    // 1. CHEF EFFECT
    const chefEffect: PulseEffect = {
        domain: 'chef',
        effectType: 'update', // matches fingerprint logic
        payload: { action: 'add_missing_grocery_item', item: 'milk' },
        confidence: 0.8,
        source: 'daily_run'
    };
    const chefKey = 'chef:update:action_add_missing_grocery_item';
    console.log(`\n🧪 Testing Chef ([${chefKey}])...`);

    // Seed as eligible
    _setMockClass(chefKey, {
        status: 'eligible',
        eligibilityScore: 0.9,
        stats: { successes: 40, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 }
    });

    const resChef = await executePulseEffect(chefEffect, 'user-1');
    // @ts-ignore
    if (resChef.autonomyLevel !== 'L1' || resChef.writeMode !== 'auto') {
        // @ts-ignore
        throw new Error(`❌ Chef Autonomy Failed: ${resChef.autonomyLevel}`);
    }
    console.log("✅ Chef Effect -> Auto (L1 Upgrade)");


    // 2. PLANNING EFFECT
    const planningEffect: PulseEffect = {
        domain: 'planning',
        effectType: 'update',
        payload: { task_id: '123' },
        confidence: 0.8,
        source: 'daily_run'
    };
    const planningKey = 'planning:update:struct_task_id';
    console.log(`\n🧪 Testing Planning ([${planningKey}])...`);

    _setMockClass(planningKey, {
        status: 'eligible',
        eligibilityScore: 0.9,
        stats: { successes: 40, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 }
    });

    const resPlanning = await executePulseEffect(planningEffect, 'user-1');
    // @ts-ignore
    if (resPlanning.autonomyLevel !== 'L1' || resPlanning.writeMode !== 'auto') {
        // @ts-ignore
        throw new Error(`❌ Planning Autonomy Failed: ${resPlanning.autonomyLevel}`);
    }
    console.log("✅ Planning Effect -> Auto (L1 Upgrade)");

    // 3. LIFE_STATE EFFECT
    const lifeEffect: PulseEffect = {
        domain: 'life_state',
        effectType: 'update',
        payload: { signal: 'damp_overload' },
        confidence: 0.8,
        source: 'daily_run'
    };
    const lifeKey = 'life_state:update:struct_signal';
    console.log(`\n🧪 Testing Life State ([${lifeKey}])...`);

    _setMockClass(lifeKey, {
        status: 'eligible',
        eligibilityScore: 0.9,
        stats: { successes: 40, confirmations: 0, rejections: 0, reverts: 0, confusionEvents: 0, ippBlocks: 0 }
    });

    const resLife = await executePulseEffect(lifeEffect, 'user-1');
    // @ts-ignore
    if (resLife.autonomyLevel !== 'L1' || resLife.writeMode !== 'auto') {
        // @ts-ignore
        throw new Error(`❌ Life State Autonomy Failed: ${resLife.autonomyLevel}`);
    }
    console.log("✅ Life State Effect -> Auto (L1 Upgrade)");


    console.log("\n🎯 Phase 20 Verification Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
