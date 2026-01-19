
import { aggregateLifeState } from '../lib/brain/lifeState/aggregateLifeState';
import { getCoordinationPolicy } from '../lib/brain/lifeState/coordinationPolicy';
import { LifeContext } from '../lib/brain/lifeState/types';

// Mock Browser Environment
// @ts-ignore
Object.defineProperty(global, 'navigator', {
    value: { onLine: true, userAgent: 'Bot' },
    writable: true,
    configurable: true
});

async function main() {
    console.log("🔍 Verifying Phase 26 (Continuous Life OS Mode)...");

    // 1. Test Aggregation: Overloaded Context
    console.log("\n🧪 Test 1: Aggregation (Overloaded)");
    const overloadedContext: LifeContext = {
        taskLoad: 15, // High
        calendarDensity: 6, // High
        recentReverts: 0,
        chefInventoryGap: 10
    };
    const state1 = aggregateLifeState(overloadedContext);

    if (state1.stress !== 'high') throw new Error(`Expected High Stress, got ${state1.stress}`);
    if (state1.energy !== 'low') throw new Error(`Expected Low Energy (due to stress), got ${state1.energy}`);
    if (!state1.riskFlags.includes('Overloaded')) throw new Error("Expected 'Overloaded' risk flag");
    console.log("✅ Overloaded Context -> High Stress / Low Energy");


    // 2. Test Coordination: High Stress Dampening
    console.log("\n🧪 Test 2: Coordination (High Stress)");
    const policy1 = getCoordinationPolicy(state1);

    if (policy1.notificationPolicy !== 'silent') throw new Error("Expected Silent notification policy");
    if (policy1.autonomyDampening < 0.5) throw new Error("Expected significant autonomy dampening");
    if (policy1.allowedDomains.includes('tasks')) throw new Error("Tasks should be restricted in High Stress");
    console.log("✅ High Stress -> Silent Mode & Restricted Domains");


    // 3. Test Aggregation: Steady State
    console.log("\n🧪 Test 3: Aggregation (Steady)");
    const steadyContext: LifeContext = {
        taskLoad: 3,
        calendarDensity: 2,
        recentReverts: 0,
        chefInventoryGap: 0
    };
    const state2 = aggregateLifeState(steadyContext);

    if (state2.stress !== 'low') throw new Error(`Expected Low Stress, got ${state2.stress}`);
    if (state2.energy !== 'high') throw new Error(`Expected High Energy, got ${state2.energy}`);
    if (state2.momentum !== 'accelerating') throw new Error(`Expected Accelerating momentum, got ${state2.momentum}`);
    console.log("✅ Steady Context -> Accelerating Momentum");


    // 4. Test Coordination: Steady State
    console.log("\n🧪 Test 4: Coordination (Steady)");
    const policy2 = getCoordinationPolicy(state2);

    if (policy2.notificationPolicy !== 'normal') throw new Error("Expected Normal notification policy");
    if (policy2.autonomyDampening !== 0) throw new Error("Expected zero dampening");
    if (!policy2.allowedDomains.includes('tasks')) throw new Error("Tasks should be allowed");
    console.log("✅ Steady State -> Normal Operations");

    console.log("\n🎯 Phase 26 Verification Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
