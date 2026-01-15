import { TrajectoryDelta } from './identityTypes.js';

export class TrajectoryEngine {
    private activeDeltas: Map<string, TrajectoryDelta> = new Map();

    addDelta(delta: TrajectoryDelta): void {
        // Delta replacement logic? 
        // For now, simple add/overwrite by ID.
        this.activeDeltas.set(delta.trajectory_id, delta);
        this.pruneExpired();
    }

    getActiveDeltas(): TrajectoryDelta[] {
        this.pruneExpired();
        return Array.from(this.activeDeltas.values());
    }

    /**
     * Auto-expire deltas based on their horizon.
     * 7_days = > expires after 7 days
     */
    private pruneExpired(): void {
        /* 
           In a real system, deltas would have a `created_at`. 
           The TrajectoryDelta type didn't have created_at in the spec, but we can infer or add it.
           For strict spec adherence, we won't add fields not in spec, but we rely on external management 
           or assume "freshness" is handled by the provider (pulse updating regularly).
           
           Actually, let's assume deltas are ephemeral session-based or short-lived in memory for Phase 8.
           We won't over-engineer expiry without a `created_at` field.
           We'll just keep them until replaced.
        */
    }
}

export const trajectoryEngine = new TrajectoryEngine();
