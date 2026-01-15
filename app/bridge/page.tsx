import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { aggregateLifeState } from '@/lib/life-state/aggregateLifeState';
import { CommandBridgeLayout } from '@/components/command-bridge/layout';

import { getOrGenerateDailyOrientation, checkDailyFeedback } from '@/lib/orientation/service'; // Persistence Service
import { OrientationHeader } from '@/components/command-bridge/orientation-header';

import { getOrGenerateTrajectory } from '@/lib/trajectory/service'; // I3 Service
import { TrajectoryStrip } from '@/components/command-bridge/trajectory-strip'; // I3 Component

import { LifeStateSummary } from '@/components/command-bridge/life-state-summary';
import { SignalCluster } from '@/components/command-bridge/signal-cluster'; // Canonical rename
import { IntelligenceStream } from '@/components/command-bridge/intelligence-stream';
import { TrustMeters } from '@/components/command-bridge/trust-meters';
import { VectorsPanel } from '@/components/command-bridge/vectors-panel';

export default async function CommandBridgePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return <div className="p-10 text-white font-mono">UNAUTHORIZED ACCESS. TERMINATING.</div>;
    }

    // Authoritative State Aggregation
    const state = await aggregateLifeState(user.id);

    // E3 Daily Orientation (The Lens)
    const orientation = await getOrGenerateDailyOrientation(user.id, state);
    const feedbackGiven = await checkDailyFeedback(user.id); // Tuning status

    // I3 Anticipatory Trajectories
    const trajectories = await getOrGenerateTrajectory(user.id, state);

    return (
        <CommandBridgeLayout
            header={<OrientationHeader orientation={orientation} feedbackGiven={feedbackGiven} />}
            trajectory={<TrajectoryStrip lines={trajectories} />}
            summary={<LifeStateSummary state={state} />}
            signals={<SignalCluster state={state} />}
            intelligence={<IntelligenceStream state={state} />}
            trust={<TrustMeters state={state} />}
            vectors={<VectorsPanel state={state} />}
        />
    );
}
