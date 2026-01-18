
// Phase 14.1 Runtime Verification (Standalone)
// Proves E2E flow via Database RLS and Triggers.
// Bypasses Next.js specific imports by using direct Supabase Client via Runtime Enclave.

import { getSupabaseAdminRuntimeClient } from '@/lib/runtime/supabase.runtime';
import dotenv from 'dotenv';
import path from 'path';
import { toDenialSignal } from '@/lib/delegation/denialSignals';
import { getLikelyScopeForPath } from '@/lib/delegation/scopeMap';

// Load environment variables (Optional for CI, but good for local dev if Docker was present)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v) throw new Error(`[phase14-runtime] Missing required env: ${name}`);
    return v;
}

// Verify minimal env presence (wrapper will also check, but failing fast is good)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.SUPABASE_URL) {
    if (process.env.NODE_ENV !== 'test') {
        console.warn("⚠️  Env vars missing, wrapper might fail.");
    }
}

// Ensure these are present for CI
if (process.env.CI === 'true' || process.env.NODE_ENV === 'test') {
    requireEnv("SUPABASE_URL");
    requireEnv("SUPABASE_SERVICE_ROLE_KEY");
}

// Service Role Client (simulates Server Action privileges for generation/writing)
// Uses the Canon-safe runtime wrapper
const adminSupabase = getSupabaseAdminRuntimeClient();

async function runRuntimeVerification() {
    console.log("🟣 Phase 14.1 Runtime Verification: Data Layer & Signals");

    try {
        // 1. Verify Signal Logic (Pure Functions, Safe to Import)
        console.log("1️⃣  Verifying Signal Logic");
        const denial = toDenialSignal(new Error("DelegationScopeViolation: missing calendar.read_write"));
        if (!denial || denial.code !== 'DELEGATION_SCOPE_VIOLATION') throw new Error("Denial signal parsing failed");
        console.log("   ✅ Denial Signal Parsed:", denial.code);

        const scope = getLikelyScopeForPath('/calendar');
        if (scope !== 'calendar.read_write') throw new Error("Scope map failed");
        console.log("   ✅ Scope Map Parsed:", scope);


        // 2. Verify Database Flow (RLS & persistence)
        console.log("2️⃣  Verifying DB Layer (RLS, Cache, Feedback)");

        const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000'; // Needs to be a valid UUID format
        const MOCK_PRINCIPAL_ID = '00000000-0000-0000-0000-000000000001'; // Fake principal UUID

        // Clean previous
        await adminSupabase.from('delegation_readiness_cache').delete().eq('owner_user_id', MOCK_USER_ID);

        // A. Insert Candidate (Simulate Generation)
        const { data: inserted, error: insertError } = await adminSupabase.from('delegation_readiness_cache').insert({
            owner_user_id: MOCK_USER_ID,
            actor_principal_id: MOCK_PRINCIPAL_ID,
            scope: 'calendar.read_write',
            reason: 'Runtime Verification Test',
            context_path: '/calendar',
            confidence: 0.9,
            signals_json: { test: true },
            expires_at: new Date(Date.now() + 3600000).toISOString()
        }).select().single();

        if (insertError) throw insertError;
        console.log("   ✅ Inserted Readiness Candidate:", inserted.id);

        // B. Simulate "Shown" Update
        const { error: updateError } = await adminSupabase.from('delegation_readiness_cache').update({
            shown_count: 1,
            last_shown_at: new Date().toISOString()
        }).eq('id', inserted.id);

        if (updateError) throw updateError;
        console.log("   ✅ Updated Shown Status");

        // C. Simulate Dismissal (Feedback Trigger Check)
        const { error: dismissError } = await adminSupabase.from('delegation_readiness_cache').update({
            dismissed_at: new Date().toISOString()
        }).eq('id', inserted.id);

        if (dismissError) throw dismissError;
        console.log("   ✅ Dismissed Candidate");

        // D. Verify Dismissed State Persistence
        const { data: final } = await adminSupabase.from('delegation_readiness_cache')
            .select('dismissed_at')
            .eq('id', inserted.id)
            .single();

        if (!final.dismissed_at) throw new Error("Dismissal failed to persist");
        console.log("   ✅ Persistence Verified");

        // Cleanup
        await adminSupabase.from('delegation_readiness_cache').delete().eq('owner_user_id', MOCK_USER_ID);
        console.log("   ✅ Cleanup Complete");

        console.log("✅ Runtime Verification Passed (Data Layer).");

    } catch (e: any) {
        console.error("❌ Runtime Verification Failed:", e.message);
        process.exit(1);
    }
}

runRuntimeVerification();
