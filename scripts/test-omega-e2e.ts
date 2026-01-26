// scripts/test-omega-e2e.ts
// E2E test for Omega Prime orchestrator

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { processSignal } from '../lib/omega/orchestrator';
import type { Signal } from '../lib/omega/types';

const TEST_USER = 'e2e_test_user_omega';

async function runE2ETest() {
  console.log('=== OMEGA PRIME E2E TEST ===\n');

  const testSignal: Signal = {
    id: crypto.randomUUID(),
    userId: TEST_USER,
    source: 'calendar',
    signalType: 'event_created',
    payload: {
      title: 'Investor Meeting - Series A Discussion',
      start: '2026-01-27T14:00:00Z',
      end: '2026-01-27T15:00:00Z',
      attendees: ['partner@vc.com', 'analyst@vc.com'],
      location: 'Zoom'
    },
    processed: false,
    createdAt: new Date().toISOString()
  };

  console.log('Input Signal:');
  console.log('  - Type:', testSignal.signalType);
  console.log('  - Title:', testSignal.payload.title);
  console.log('  - Attendees:', testSignal.payload.attendees.length);

  try {
    console.log('\nProcessing signal through Omega pipeline...');

    const result = await processSignal(TEST_USER, testSignal, {
      skipGuardian: true, // Skip guardian for testing
      runDiagnoser: false,
      runSimulator: false,
      runEvolver: false,
      runObserver: false
    });

    console.log('\n--- RESULT ---');
    console.log('  Approved:', result.approved);
    console.log('  Auto-executed:', result.autoExecuted);
    console.log('  Error:', result.error || 'none');

    // Show reasoning trace for debugging
    if (result.state.reasoningTrace && result.state.reasoningTrace.length > 0) {
      console.log('\n--- REASONING TRACE ---');
      for (const step of result.state.reasoningTrace) {
        console.log(`  Step ${step.step}: ${step.action}`);
        console.log(`    Reasoning: ${step.reasoning}`);
        console.log(`    Duration: ${step.durationMs}ms`);
      }
    }

    if (result.draft) {
      console.log('\n--- GENERATED DRAFT ---');
      console.log('  Type:', result.draft.draftType);
      console.log('  Title:', result.draft.title);
      console.log('  Confidence:', result.draft.confidence);
      console.log('  Status:', result.draft.status);
    }

    if (result.state.intent) {
      console.log('\n--- PREDICTED INTENT ---');
      console.log('  Need:', result.state.intent.predictedNeed);
      console.log('  Confidence:', result.state.intent.confidence);
      console.log('  Urgency:', result.state.intent.urgency);
    }

    console.log('\n=== E2E TEST COMPLETE ===');

  } catch (error) {
    console.error('\nE2E Test Error:', error);
  }
}

runE2ETest();
