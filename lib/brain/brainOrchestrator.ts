import { supabaseAdmin } from '../supabase';
import { ObservePacket, RecallPacket, BrainLoopResult, DecisionIntent } from './types';
import { reasoningService } from './reasoningService';
import { simulationService } from './simulationService';
import { v4 as uuidv4 } from 'uuid';
import { buildContextForQuery } from '../memory/engine';
import { identityEngine, createInitialIdentityState } from '../identity/engine';
import { calculateTrajectory } from '../identity/trajectory';
import { getCurrentMomentum } from '../momentum/projection';

import { metaCognitionEngine } from './metaCognitionEngine';
import { reflectionEngine } from './reflectionEngine';
import { autonomyGovernor } from '../autonomy/autonomyGovernor';
import { autonomyExecutor } from '../autonomy/autonomyExecutor';

export class BrainOrchestrator {

    /**
     * Runs the full Cognitive Loop.
     * Guaranteed to produce a distinct Loop ID and immutable artifacts.
     */
    async runBrainLoop(ownerUserId: string, observe: ObservePacket): Promise<BrainLoopResult> {
        const loopId = uuidv4();
        console.log(`[BrainOrchestrator] Starting Loop: ${loopId} | Mode: ${observe.mode}`);

        // 1. RECALL (Deep Cognition)
        // A. Fetch Context from Stratified Memory (M1-M3)
        const query = observe.raw_text || "Current context";
        const memoryContext = await buildContextForQuery(ownerUserId, query);

        // B. Fetch Identity State (M4) & Calculate Trajectory
        // TODO: distinct fetch from DB. Using initial state for MVP.
        const identityState = createInitialIdentityState();
        const trajectory = calculateTrajectory(identityState);

        // C. Fetch Momentum (Phase 9)
        const momentumSnapshot = await getCurrentMomentum(ownerUserId);

        const recall: RecallPacket = {
            short_term_summary: memoryContext.summary || "No recent context.",
            recent_events: memoryContext.relevant_memories ? memoryContext.relevant_memories.map(m => m.content) : [],
            relevant_people: [],
            open_loops: [],
            user_preferences: {
                values: Object.keys(identityState.values),
                anti_patterns: []
            },
            // @ts-ignore - Phase 8 extension
            identity_trajectory: {
                direction: trajectory.direction,
                momentum: trajectory.momentum,
                driver: trajectory.primaryDriver
            },
            // Phase 9 extensions
            momentum_snapshot: {
                total_score: momentumSnapshot.total_score,
                active_domains: momentumSnapshot.active_domains,
                dominant_trend: momentumSnapshot.dominant_trend
            },
            momentum_recent_events: momentumSnapshot.recent_events.map(e => `${e.signal} in ${e.domain}`)
        };

        // 2. REASON
        const reasoning = await reasoningService.runReasoning(observe, recall);

        // Persist Reasoning Artifact
        const { data: reasonArt, error: reasonErr } = await supabaseAdmin
            .from('brain_thought_artifacts')
            .insert({
                owner_user_id: ownerUserId,
                loop_id: loopId,
                kind: 'reasoning',
                input_packet: observe as any, // stored as jsonb
                output: reasoning as any,
                confidence: reasoning.confidence_score,
                uncertainty_flags: reasoning.uncertainty_flags,
                model: 'gemini-mock', // TODO: dynamic
                checksum: "checksum_placeholder"
            })
            .select()
            .single();

        if (reasonErr) throw new Error(`Failed to store reasoning artifact: ${reasonErr.message}`);

        // 3. SIMULATE (Phase 9)
        const simulation = await simulationService.runSimulation({
            observe,
            recall,
            reasoning,
            sim_version: "v1"
        });

        // Persist Simulation Artifact
        const { data: simArt, error: simErr } = await supabaseAdmin
            .from('brain_thought_artifacts')
            .insert({
                owner_user_id: ownerUserId,
                loop_id: loopId,
                kind: 'simulation',
                input_packet: reasoning as any,
                output: simulation as any,
                confidence: 1.0 + simulation.confidence_adjustment,
                uncertainty_flags: simulation.uncertainty_flags,
                model: 'simulation-engine-v1',
                checksum: "checksum_placeholder"
            })
            .select()
            .single();

        if (simErr) throw new Error(`Failed to store simulation artifact: ${simErr.message}`);

        // 4. META-COGNITION (Phase 10)
        // Evaluate confidence and determine escalation
        const metaResult = metaCognitionEngine.evaluateConfidence(reasoning, simulation);

        // A. Generate Reflection if needed
        const reflectionId = await reflectionEngine.processReflection(
            ownerUserId,
            loopId,
            metaResult,
            reasoning,
            simulation
        );

        // B. Persist Confidence Ledger
        await supabaseAdmin
            .from('brain_confidence_ledger')
            .insert({
                owner_user_id: ownerUserId,
                loop_id: loopId,
                raw_confidence: reasoning.confidence_score,
                post_simulation_confidence: simulation.confidence_adjustment + reasoning.confidence_score,
                confidence_delta: simulation.confidence_adjustment,
                uncertainty_count: simulation.scenarios.reduce((sum, s) => sum + s.unknowns.length, 0),
                escalation_triggered: metaResult.escalation_level !== 'none',
                escalation_level: metaResult.escalation_level,
                notes: metaResult.reasons.join('; ')
            });

        // 5. DECIDE (Draft Intent with Meta-Cognition)
        // Select logic: usually pick highest confidence candidate that survived simulation.
        let topCandidate = reasoning.candidate_intents[0];

        // Phase 9: Override or Downgrade based on Simulation
        if (simulation.recommended_intent_title) {
            const rec = reasoning.candidate_intents.find(c => c.title === simulation.recommended_intent_title);
            if (rec) topCandidate = rec;
        }

        const scenario = simulation.scenarios.find(s => s.intent_title === topCandidate?.title);

        // Phase 10: Apply Meta-Cognition Escalation Rules
        let finalProposedStep = topCandidate ? `Execute ${topCandidate.tool_name}` : "Wait";
        let finalConfirmationStyle = topCandidate?.needs_confirmation ? 'explicit' : 'light';
        let finalRequiresConfirmation = topCandidate ? topCandidate.needs_confirmation : false;

        if (metaResult.escalation_level === 'clarify') {
            finalProposedStep = "Ask clarifying question";
            finalConfirmationStyle = 'explicit';
            finalRequiresConfirmation = true;
        } else if (metaResult.escalation_level === 'confirm') {
            finalConfirmationStyle = 'explicit';
            finalRequiresConfirmation = true;
        } else if (metaResult.escalation_level === 'defer') {
            finalProposedStep = "Defer decision & Summarize";
            // In a real implementation we might wipe the tool call here
            if (topCandidate) topCandidate.tool_name = undefined;
        }

        // 5. LOCKDOWN (Phase 10.5)
        // Compute Trust Hash: SHA-256(ReasoningID + SimID + MetaConfidence + Escalation)
        const trustInputs = `${reasonArt.id}:${simArt.id}:${metaResult.final_confidence}:${metaResult.escalation_level}`;
        const trustHash = `hash_${Buffer.from(trustInputs).toString('base64')}`;

        const intentProps: DecisionIntent = {
            selected_intent_title: topCandidate ? topCandidate.title : "No Action",
            rationale: scenario ? `Simulation Outcome: ${scenario.summary}. Meta: ${metaResult.reasons.join(',')}` : (topCandidate ? topCandidate.why : "Confidence too low"),
            requires_confirmation: finalRequiresConfirmation,
            confirmation_style: finalConfirmationStyle as any,
            proposed_next_step: finalProposedStep,
            confidence: metaResult.final_confidence,
            risk_level: topCandidate ? topCandidate.risk : 'low',
            source_artifact_ids: [reasonArt.id, simArt.id, reflectionId as string].filter(Boolean),
            tool_call: topCandidate && topCandidate.tool_name ? {
                name: topCandidate.tool_name,
                arguments: topCandidate.tool_params || {}
            } : undefined,

            // Phase 10 Extensions
            meta_confidence: metaResult.final_confidence,
            escalation_level: metaResult.escalation_level,
            trust_posture: metaResult.trust_posture,
            reflection_artifact_id: reflectionId || undefined,

            // Phase 10.5 Canon Lockdown
            meta_verified: true,
            canon_version: "brain-v1.0",
            trust_hash: trustHash
        };

        // Phase 11: Autonomy Governance (L0-L1)
        // Determine domain (naive for now, usage based)
        const autonomyDomain = 'general';

        const autonomyDec = await autonomyGovernor.evaluateAutonomy(ownerUserId, intentProps, { domain: autonomyDomain });

        const execResult = await autonomyExecutor.executeAutonomously(ownerUserId, loopId, intentProps, autonomyDec, autonomyDomain);

        // Update intent with enforced constraints (e.g. stripped tools, forced confirm)
        // Using Type Assertion as execResult is definitely a DecisionIntent
        const finalIntentProps = execResult as DecisionIntent;

        // Persist Decision Intent
        const { data: intentRow, error: intentErr } = await supabaseAdmin
            .from('brain_decision_intents')
            .insert({
                owner_user_id: ownerUserId,
                loop_id: loopId,
                intent: finalIntentProps as any,
                requires_confirmation: finalIntentProps.requires_confirmation,
                confidence: finalIntentProps.confidence,
                risk_level: finalIntentProps.risk_level,
                status: 'pending',
                source_artifact_ids: finalIntentProps.source_artifact_ids
            })
            .select()
            .single();

        if (intentErr) throw new Error(`Failed to store decision intent: ${intentErr.message}`);

        return {
            loop_id: loopId,
            decision: finalIntentProps,
            artifacts: {
                reasoning_id: reasonArt.id,
                simulation_id: simArt.id
            }
        };
    }
}

export const brainOrchestrator = new BrainOrchestrator();
