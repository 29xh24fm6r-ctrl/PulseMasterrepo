import { contextStore } from './contextStore.js';
import { UserMode, ModeState } from './contextTypes.js';

export class ModeDetector {

    detect(callId: string, text: string): ModeState {
        const context = contextStore.get(callId);
        const lower = text.toLowerCase();

        let detected = UserMode.CALM;
        const reasons: string[] = [];
        let confidence = 0.8; // Default confidence

        // 1. URGENT Markers
        const urgentKeywords = ['urgent', 'right now', 'immediately', 'asap', 'this instant', 'hurry'];
        if (urgentKeywords.some(w => lower.includes(w))) {
            detected = UserMode.URGENT;
            reasons.push('keyword_urgent');
            confidence = 0.95;
        }

        // 2. STRESSED Markers
        // Overrides urgent if explicitly "overwhelmed" unless "right now" is also present?
        // Let's say URGENT trumps STRESSED for action speed, but STRESSED trumps CALM.
        const stressedKeywords = [
            'overwhelmed', 'shit', 'fuck', 'too much', 'can\'t handle',
            'running late', 'behind schedule', 'so much to do', 'stressed',
            'panic', 'forgetting everything'
        ];

        // If not already urgent, check stress
        if (detected !== UserMode.URGENT && stressedKeywords.some(w => lower.includes(w))) {
            detected = UserMode.STRESSED;
            reasons.push('keyword_stress');
            confidence = 0.9;
        }

        // 3. FOCUSED Markers
        // Short, command-like, or explicit "let's focus"
        if (detected === UserMode.CALM) {
            const focusedKeywords = ['focus', 'let\'s go', 'next', 'quickly'];
            if (focusedKeywords.some(w => lower.includes(w))) {
                detected = UserMode.FOCUSED;
                reasons.push('keyword_focus');
            }
        }

        // 4. Persistence / Decay
        // If user WAS Stressed/Urgent, we don't snap back to Calm immediately 
        // unless they say "I'm calm now".
        // For Phase 6.0, we'll be reactive per utterance but maybe sticky?
        // Let's implement simple stickiness: simple keywords override, otherwise 
        // decay slowly or stay same?
        // The prompt says "recalculated per utterance" but also "conservative".

        // STICKINESS LOGIC:
        // If previous included STRESSED, and current is CALM (no keywords),
        // we might degrade to FOCUSED or stay STRESSED?
        // For safety/simplicity in V1: 
        // If new detection is CALM, but previous was STRESSED/URGENT, check history depth?
        // Let's just return the new detection for now, orchestrator can handle smoothing if needed,
        // OR we just allow switching.

        // Actually, prompt says: "default to CALM unless strong evidence".
        // So hitting "overwhelmed" once switches mode. Next turn "add milk" -> still overwhelmed?
        // PROBABLY YES. 
        // So we should look at previous mode.

        const prevMode = context.mode.current;
        if (detected === UserMode.CALM && prevMode !== UserMode.CALM) {
            // Decay logic: 
            // Urgent -> Focused
            // Stressed -> Stressed (needs explicit calm down or time?)
            // Focused -> Calm

            if (prevMode === UserMode.URGENT) {
                detected = UserMode.FOCUSED;
                reasons.push('decay_from_urgent');
            } else if (prevMode === UserMode.STRESSED) {
                // Keep stressed for a bit unless explicit "I'm good"
                // Simplified: Keep stressed for N turns?
                // Let's just keep reference to previous
                detected = UserMode.STRESSED;
                reasons.push('sticky_stress');
            }
        }

        return {
            current: detected,
            confidence,
            reasons,
            lastUpdated: Date.now()
        };
    }
}

export const modeDetector = new ModeDetector();
