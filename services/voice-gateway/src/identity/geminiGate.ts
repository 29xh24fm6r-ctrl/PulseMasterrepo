import { GeminiInsightEnvelope } from './identityTypes.js';

export class GeminiGate {
    private static MIN_CONFIDENCE = 0.6;

    /**
     * Validates an incoming Gemini Insight Envelope.
     * Enforces strict data sufficiency and confidence rules.
     * 
     * @param envelope The raw envelope from Gemini
     * @returns The validated envelope if it passes, or null if discarded.
     */
    validateEnvelope(envelope: GeminiInsightEnvelope): GeminiInsightEnvelope | null {
        // 1. Check Data Sufficiency
        if (envelope.confidence_summary.data_sufficiency === 'low') {
            console.warn(`[GeminiGate] Discarding Envelope: Low Data Sufficiency`);
            return null;
        }

        // 2. Check Overall Confidence
        if (envelope.confidence_summary.overall_confidence < GeminiGate.MIN_CONFIDENCE) {
            console.warn(`[GeminiGate] Discarding Envelope: Low Confidence (${envelope.confidence_summary.overall_confidence})`);
            return null;
        }

        // 3. Filter Individual Signals (Double Check)
        if (envelope.identity_signals) {
            const validSignals = envelope.identity_signals.filter(s => s.confidence >= GeminiGate.MIN_CONFIDENCE);
            if (validSignals.length < envelope.identity_signals.length) {
                console.warn(`[GeminiGate] Filtered ${envelope.identity_signals.length - validSignals.length} low-confidence signals.`);
                envelope.identity_signals = validSignals;
            }
        }

        // 4. Filter Trajectory Deltas
        if (envelope.trajectory_deltas) {
            const validDeltas = envelope.trajectory_deltas.filter(d => d.confidence >= GeminiGate.MIN_CONFIDENCE);
            if (validDeltas.length < envelope.trajectory_deltas.length) {
                console.warn(`[GeminiGate] Filtered ${envelope.trajectory_deltas.length - validDeltas.length} low-confidence deltas.`);
                envelope.trajectory_deltas = validDeltas;
            }
        }

        // If after filtering we have nothing valid, discourage partial usage? 
        // No, partial valid data is acceptable if the overall sufficiency was met.

        return envelope;
    }
}

export const geminiGate = new GeminiGate();
