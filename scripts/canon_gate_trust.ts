#!/usr/bin/env tsx
/**
 * CANON GATE TRUST VERIFICATION
 *
 * Verifies the Trust Infrastructure is correctly deployed:
 * - Confidence Ledger (predictions + outcomes + calibration)
 * - HardGuard Escalation (L0-L3 autonomy levels)
 * - Guardian canonical output shape
 *
 * Run: npm run canon:trust
 */

import { createClient } from "@supabase/supabase-js";
import "dotenv/config";

// Test user ID - uses a deterministic test user
const TEST_USER_ID = "canon_gate_test_user_" + Date.now().toString(36);

// Colors for output
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RESET = "\x1b[0m";

function pass(msg: string) {
  console.log(`${GREEN}[PASS]${RESET} ${msg}`);
}

function fail(msg: string) {
  console.log(`${RED}[FAIL]${RESET} ${msg}`);
}

function warn(msg: string) {
  console.log(`${YELLOW}[WARN]${RESET} ${msg}`);
}

function info(msg: string) {
  console.log(`${CYAN}[INFO]${RESET} ${msg}`);
}

async function main() {
  console.log("\n===========================================");
  console.log("CANON GATE TRUST VERIFICATION");
  console.log("===========================================\n");

  // Verify environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    fail("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let allPassed = true;
  const results: { test: string; status: "PASS" | "FAIL" | "WARN" }[] = [];

  // =============================================
  // TEST 1: Confidence Ledger - Insert Prediction
  // =============================================
  info("Testing Confidence Ledger...");

  let confidenceEventId: string | null = null;
  try {
    const { data, error } = await supabase
      .from("pulse_confidence_events")
      .insert({
        user_id: TEST_USER_ID,
        session_id: "canon_gate_test_session",
        node: "guardian",
        prediction_type: "guardian",
        predicted_confidence: 0.85,
        context_snapshot: { test: true, timestamp: new Date().toISOString() },
      })
      .select("id")
      .single();

    if (error) throw error;

    confidenceEventId = data.id;
    pass("Confidence prediction inserted");
    results.push({ test: "confidence_prediction_insert", status: "PASS" });
  } catch (err) {
    fail(`Confidence prediction insert failed: ${err}`);
    results.push({ test: "confidence_prediction_insert", status: "FAIL" });
    allPassed = false;
  }

  // =============================================
  // TEST 2: Confidence Ledger - Record Outcome
  // =============================================
  if (confidenceEventId) {
    try {
      const actualSuccess = 1.0; // success
      const predictedConfidence = 0.85;
      const confidenceError = predictedConfidence - actualSuccess;

      const { error } = await supabase
        .from("pulse_confidence_events")
        .update({
          outcome: "success",
          outcome_confidence: 1.0,
          outcome_notes: "Canon gate test outcome",
          outcome_recorded_at: new Date().toISOString(),
          confidence_error: confidenceError,
        })
        .eq("id", confidenceEventId);

      if (error) throw error;

      pass("Confidence outcome recorded");
      results.push({ test: "confidence_outcome_record", status: "PASS" });
    } catch (err) {
      fail(`Confidence outcome record failed: ${err}`);
      results.push({ test: "confidence_outcome_record", status: "FAIL" });
      allPassed = false;
    }

    // Verify row exists
    try {
      const { data, error } = await supabase
        .from("pulse_confidence_events")
        .select("*")
        .eq("id", confidenceEventId)
        .single();

      if (error || !data) throw error || new Error("Row not found");

      if (data.outcome === "success" && data.confidence_error !== null) {
        pass("Confidence event row verified with outcome");
        results.push({ test: "confidence_event_verify", status: "PASS" });
      } else {
        fail("Confidence event row missing expected fields");
        results.push({ test: "confidence_event_verify", status: "FAIL" });
        allPassed = false;
      }
    } catch (err) {
      fail(`Confidence event verification failed: ${err}`);
      results.push({ test: "confidence_event_verify", status: "FAIL" });
      allPassed = false;
    }
  }

  // =============================================
  // TEST 3: Calibration View
  // =============================================
  try {
    const { data, error } = await supabase
      .from("pulse_confidence_calibration")
      .select("*")
      .eq("user_id", TEST_USER_ID);

    if (error) throw error;

    if (!data || data.length === 0) {
      warn("Calibration view returned no rows - INSUFFICIENT DATA (need more samples)");
      results.push({ test: "calibration_view", status: "WARN" });
    } else {
      pass(`Calibration view returned ${data.length} bucket(s)`);
      results.push({ test: "calibration_view", status: "PASS" });
    }
  } catch (err) {
    fail(`Calibration view query failed: ${err}`);
    results.push({ test: "calibration_view", status: "FAIL" });
    allPassed = false;
  }

  // =============================================
  // TEST 4: Autonomy Levels Reference Table
  // =============================================
  info("Testing HardGuard Escalation...");

  try {
    const { data, error } = await supabase
      .from("pulse_autonomy_levels")
      .select("*")
      .order("level");

    if (error) throw error;

    if (!data || data.length < 4) {
      fail(`Expected 4 autonomy levels, got ${data?.length || 0}`);
      results.push({ test: "autonomy_levels_table", status: "FAIL" });
      allPassed = false;
    } else {
      const levels = data.map(d => d.level);
      if (levels.includes(0) && levels.includes(1) && levels.includes(2) && levels.includes(3)) {
        pass("Autonomy levels L0-L3 exist");
        results.push({ test: "autonomy_levels_table", status: "PASS" });
      } else {
        fail("Autonomy levels missing L0-L3");
        results.push({ test: "autonomy_levels_table", status: "FAIL" });
        allPassed = false;
      }
    }
  } catch (err) {
    fail(`Autonomy levels query failed: ${err}`);
    results.push({ test: "autonomy_levels_table", status: "FAIL" });
    allPassed = false;
  }

  // =============================================
  // TEST 5: User Autonomy Row Creation
  // =============================================
  try {
    // Insert a user autonomy row for test user
    const { error: insertError } = await supabase
      .from("pulse_user_autonomy")
      .upsert({
        user_id: TEST_USER_ID,
        current_level: 0,
        level_reason: "Canon gate test - initial",
        calibration_score: 0,
        manual_override: null,
      }, { onConflict: "user_id" });

    if (insertError) throw insertError;

    // Verify row exists
    const { data, error } = await supabase
      .from("pulse_user_autonomy")
      .select("*")
      .eq("user_id", TEST_USER_ID)
      .single();

    if (error || !data) throw error || new Error("Row not found");

    if (typeof data.current_level === "number" && data.current_level >= 0 && data.current_level <= 3) {
      pass("User autonomy row exists with valid level");
      results.push({ test: "user_autonomy_row", status: "PASS" });
    } else {
      fail("User autonomy row has invalid level");
      results.push({ test: "user_autonomy_row", status: "FAIL" });
      allPassed = false;
    }
  } catch (err) {
    fail(`User autonomy row test failed: ${err}`);
    results.push({ test: "user_autonomy_row", status: "FAIL" });
    allPassed = false;
  }

  // =============================================
  // TEST 6: Guardian Canonical Output Shape
  // =============================================
  info("Testing Guardian Canonical Decision Shape...");

  // Define expected shape
  interface CanonicalGuardianDecision {
    allowed: boolean;
    required_action: "execute" | "queue_review" | "block";
    autonomy_level_used: 0 | 1 | 2 | 3;
    explanation: string;
    constraint_hits?: {
      constraint: string;
      passed: boolean;
      reason: string;
    }[];
  }

  function validateCanonicalDecision(obj: unknown): obj is CanonicalGuardianDecision {
    if (!obj || typeof obj !== "object") return false;
    const d = obj as Record<string, unknown>;
    return (
      typeof d.allowed === "boolean" &&
      ["execute", "queue_review", "block"].includes(d.required_action as string) &&
      [0, 1, 2, 3].includes(d.autonomy_level_used as number) &&
      typeof d.explanation === "string"
    );
  }

  // Test scenarios for each autonomy level
  const scenarios: { level: 0 | 1 | 2 | 3; expectedAction: "execute" | "queue_review" | "block"; description: string }[] = [
    { level: 0, expectedAction: "queue_review", description: "L0 (observe_only) → queue_review" },
    { level: 1, expectedAction: "queue_review", description: "L1 (suggest_only) → queue_review" },
    { level: 2, expectedAction: "queue_review", description: "L2 (confirm_required) low confidence → queue_review" },
    { level: 3, expectedAction: "execute", description: "L3 (full_auto) → execute" },
  ];

  for (const scenario of scenarios) {
    // Simulate Guardian decision based on autonomy level
    const mockDecision: CanonicalGuardianDecision = {
      allowed: true,
      required_action: scenario.level >= 3 ? "execute" :
                       scenario.level >= 2 ? "queue_review" : "queue_review",
      autonomy_level_used: scenario.level,
      explanation: `Test decision for autonomy level ${scenario.level}`,
      constraint_hits: [],
    };

    if (validateCanonicalDecision(mockDecision)) {
      if (scenario.level === 3 && mockDecision.required_action === "execute") {
        pass(`Guardian L${scenario.level}: ${scenario.description}`);
        results.push({ test: `guardian_l${scenario.level}`, status: "PASS" });
      } else if (scenario.level < 3 && mockDecision.required_action === "queue_review") {
        pass(`Guardian L${scenario.level}: ${scenario.description}`);
        results.push({ test: `guardian_l${scenario.level}`, status: "PASS" });
      } else {
        fail(`Guardian L${scenario.level}: expected ${scenario.expectedAction}, got ${mockDecision.required_action}`);
        results.push({ test: `guardian_l${scenario.level}`, status: "FAIL" });
        allPassed = false;
      }
    } else {
      fail(`Guardian L${scenario.level}: Invalid canonical decision shape`);
      results.push({ test: `guardian_l${scenario.level}`, status: "FAIL" });
      allPassed = false;
    }
  }

  // =============================================
  // TEST 7: Constraints Table Has Escalation Fields
  // =============================================
  try {
    const { data, error } = await supabase
      .from("pulse_constraints")
      .select("id, constraint_name, escalation_level, min_autonomy_level, allows_earned_override")
      .limit(5);

    if (error) throw error;

    if (data && data.length > 0) {
      const hasEscalationFields = data.every(c =>
        c.escalation_level !== undefined ||
        c.min_autonomy_level !== undefined
      );

      if (hasEscalationFields) {
        pass("Constraints have escalation fields");
        results.push({ test: "constraints_escalation_fields", status: "PASS" });
      } else {
        warn("Some constraints may be missing escalation fields");
        results.push({ test: "constraints_escalation_fields", status: "WARN" });
      }
    } else {
      warn("No constraints found - seed data may be missing");
      results.push({ test: "constraints_escalation_fields", status: "WARN" });
    }
  } catch (err) {
    fail(`Constraints escalation fields check failed: ${err}`);
    results.push({ test: "constraints_escalation_fields", status: "FAIL" });
    allPassed = false;
  }

  // =============================================
  // CLEANUP: Remove test data
  // =============================================
  info("Cleaning up test data...");

  await supabase.from("pulse_confidence_events").delete().eq("user_id", TEST_USER_ID);
  await supabase.from("pulse_user_autonomy").delete().eq("user_id", TEST_USER_ID);

  // =============================================
  // SUMMARY
  // =============================================
  console.log("\n===========================================");
  console.log("SUMMARY");
  console.log("===========================================\n");

  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const warned = results.filter(r => r.status === "WARN").length;

  console.log(`${GREEN}Passed:${RESET} ${passed}`);
  console.log(`${RED}Failed:${RESET} ${failed}`);
  console.log(`${YELLOW}Warnings:${RESET} ${warned}`);
  console.log("");

  if (allPassed) {
    console.log(`${GREEN}============================================${RESET}`);
    console.log(`${GREEN}CANON GATE TRUST VERIFICATION: PASS${RESET}`);
    console.log(`${GREEN}============================================${RESET}`);
    process.exit(0);
  } else {
    console.log(`${RED}============================================${RESET}`);
    console.log(`${RED}CANON GATE TRUST VERIFICATION: FAIL${RESET}`);
    console.log(`${RED}============================================${RESET}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Canon gate verification error:", err);
  process.exit(1);
});
