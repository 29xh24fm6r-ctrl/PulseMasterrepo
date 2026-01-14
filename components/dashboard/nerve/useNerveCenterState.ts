'use client';

import { useState, useEffect } from 'react';
import { NerveCenterState, PulseSystemId, PulseSystemState } from '@/lib/nerve/types';
import { mapNerveCenterState } from '@/lib/nerve/mapNerveCenterState';
import { NerveInput } from '@/lib/nerve/input';

// --- MOCK DATA GENERATOR (For Initial Implementation) ---
const generateMockInput = (): NerveInput => {
    const now = new Date().toISOString();
    return {
        now,
        tasks: [
            { id: 't1', title: 'Complete Phase 3 Deploy', due_date: now, priority: 'p1', status: 'pending' },
            { id: 't2', title: 'Review System Specs', due_date: null, priority: 'p2', status: 'pending' },
            { id: 't3', title: 'Client Call Preparation', due_date: now, priority: 'p1', status: 'pending' },
        ],
        calendar: [
            { id: 'c1', title: 'Phase 3 Sync', start_time: now, end_time: new Date(Date.now() + 3600000).toISOString() }
        ],
        crm: [],
        notes: [],
        activity: [],
        biometrics: {
            focus_score: 85, // Simulating "High Focus"
            last_sync: now
        }
    };
};

export const useNerveCenterState = () => {
    const [state, setState] = useState<NerveCenterState | null>(null);
    const [activeSystemId, setActiveSystemId] = useState<PulseSystemId | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Stick to the "No Drift" policy: fetch once, map purely
        const fetchData = async () => {
            // In real implementation, this would be parallel fetch from APIs
            // await Promise.all([fetchTasks(), fetchCalendar()...])

            const input = generateMockInput();
            const mappedState = mapNerveCenterState(input);

            setState(mappedState);
            setLoading(false);
        };

        fetchData();

        // Optional: Real-time re-fetch interval
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    return {
        state,
        loading,
        activeSystemId,
        setActiveSystemId
    };
};
