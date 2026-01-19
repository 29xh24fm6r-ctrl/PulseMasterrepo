
import fs from 'fs';
import path from 'path';
import { executePulseEffect } from '../lib/brain/writeAuthority/executePulseEffect';
import { PulseEffect } from '../lib/brain/writeAuthority/types';
import { dailyRun } from '../lib/brain/dailyRun';

// Mock Browser Environment for Voice/Observer
// @ts-ignore
global.window = {
    location: { reload: () => { }, href: '', hostname: 'localhost' },
    localStorage: {
        getItem: (k: string) => k === 'pulse.observer.enabled' ? 'true' : null,
        setItem: () => { },
        removeItem: () => { }
    },
    speechSynthesis: { cancel: () => { }, speak: () => { } }
};
// @ts-ignore
global.SpeechSynthesisUtterance = class { };
// @ts-ignore
Object.defineProperty(global, 'navigator', {
    value: { onLine: true, userAgent: 'Bot' },
    writable: true,
    configurable: true
});


async function main() {
    console.log("🔍 Verifying Phase 18 (OWA)...");

    // 1. Test Confidence Gating
    console.log("\n🧪 Testing Confidence Gating...");

    const lowConfEffect: PulseEffect = {
        domain: 'tasks', effectType: 'create', payload: {}, confidence: 0.5, source: 'manual'
    };
    const confirmEffect: PulseEffect = {
        domain: 'tasks', effectType: 'create', payload: {}, confidence: 0.7, source: 'manual'
    };
    const highConfEffect: PulseEffect = {
        domain: 'tasks', effectType: 'create', payload: {}, confidence: 0.9, source: 'manual'
    };

    const resLow = await executePulseEffect(lowConfEffect, 'user-1');
    if (resLow.writeMode !== 'proposed' || resLow.applied) {
        throw new Error(`❌ Low confidence failed. Got ${resLow.writeMode}, applied: ${resLow.applied}`);
    }
    console.log("✅ Low Confidence -> Proposed (Not Applied)");

    const resConfirm = await executePulseEffect(confirmEffect, 'user-1');
    if (resConfirm.writeMode !== 'confirm' || resConfirm.applied) {
        throw new Error(`❌ Confirm confidence failed. Got ${resConfirm.writeMode}, applied: ${resConfirm.applied}`);
    }
    console.log("✅ Medium Confidence -> Confirm (Not Applied)");

    const resAuto = await executePulseEffect(highConfEffect, 'user-1');
    if (resAuto.writeMode !== 'auto' || !resAuto.applied) {
        throw new Error(`❌ High confidence failed. Got ${resAuto.writeMode}, applied: ${resAuto.applied}`);
    }
    console.log("✅ High Confidence -> Auto (Applied)");


    // 2. Test IPP Blocking
    console.log("\n🧪 Testing IPP Blocking...");
    // Simulate Auth Missing by passing empty ownerId
    const resBlocked = await executePulseEffect(highConfEffect, '');
    if (resBlocked.success) {
        throw new Error("❌ IPP failed to block write when owner missing");
    }
    console.log("✅ IPP Blocked Write (Auth Missing)");


    // 3. Test Daily Run
    console.log("\n🧪 Testing Daily Run...");
    const dailyRes = await dailyRun('user-1');
    if (!dailyRes.success || !dailyRes.applied) {
        throw new Error("❌ Daily Run failed to auto-apply");
    }
    console.log("✅ Daily Run Success");

    console.log("\n🎯 Phase 18 Verification Complete.");
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
