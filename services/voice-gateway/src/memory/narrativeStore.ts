import { NarrativeAnchor, MemoryLayer } from './memoryTypes.js';

export class NarrativeStore {
    private anchors: Map<string, NarrativeAnchor> = new Map();

    /**
     * Writes to M5 Narrative Memory.
     * CRITICAL: FAILS if explicit user confirmation is not provided/simulated.
     * In a real system, this would require a signed token or specific intent flag.
     * 
     * @param statement The anchor statement
     * @param isConfirmed Boolean flag acting as the gatekeeper
     */
    addAnchor(statement: string, isConfirmed: boolean): NarrativeAnchor {
        if (!isConfirmed) {
            throw new Error("SECURITY_BLOCK: M5 Write Denied. Explicit user confirmation required.");
        }

        const anchor: NarrativeAnchor = {
            anchor_id: `anchor-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            statement,
            confirmed_at: new Date().toISOString(),
            confidence: 1.0
        };

        this.anchors.set(anchor.anchor_id, anchor);
        console.log(`[NarrativeStore] M5 Write Success: "${statement}"`);
        return anchor;
    }

    getAnchors(): NarrativeAnchor[] {
        return Array.from(this.anchors.values());
    }

    // M5 is Immutable unless explicitly revoked (implementation skipped for now, but noted)
    revokeAnchor(anchorId: string): void {
        if (this.anchors.has(anchorId)) {
            this.anchors.delete(anchorId);
            console.log(`[NarrativeStore] M5 Revoked: ${anchorId}`);
        }
    }
}

export const narrativeStore = new NarrativeStore();
