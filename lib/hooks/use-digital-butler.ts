"use client";

import { useState, useEffect, useCallback } from "react";
import {
    getWorkQueue,
    getDealsPipeline,
    InboxItem,
    Deal,
    inboxToTask,
    inboxToFollowUp,
    updateInboxItem,
    inboxSnooze,
    inboxQuickComplete
} from "@/lib/api/core";

export interface DashboardData {
    inbox: InboxItem[];
    deals: Deal[];
    activeTaskCount: number;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
}

export function useDigitalButler(): DashboardData {
    const [inbox, setInbox] = useState<InboxItem[]>([]);
    const [deals, setDeals] = useState<Deal[]>([]);
    const [activeTaskCount, setActiveTaskCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            // Parallel fetch for speed
            const [workRes, dealsRes] = await Promise.all([
                getWorkQueue(),
                getDealsPipeline()
            ]);

            setInbox(workRes.inbox || []);

            // Flatten deals from pipeline stages for the "Radar" view
            // We likely want "Active" deals, usually in middle stages
            const allDeals = Object.values(dealsRes.dealsByStage).flat();
            setDeals(allDeals);

            setActiveTaskCount(workRes.tasksDueToday?.length || 0);

        } catch (e: any) {
            console.error("Butler Fetch Error:", e);
            setError(e.message || "Failed to sync Digital Butler");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    return {
        inbox,
        deals,
        activeTaskCount,
        loading,
        error,
        refresh: fetchData
    };
}

// Quick Actions Hook
export function useButlerActions(refresh: () => Promise<void>) {

    const handleArchive = async (id: string) => {
        await updateInboxItem({ id, is_archived: true });
        await refresh();
    };

    const handleSnooze = async (id: string) => {
        await inboxSnooze(id, "tomorrow_morning");
        await refresh();
    };

    const handleQuickComplete = async (id: string) => {
        await inboxQuickComplete(id, false);
        await refresh();
    };

    const handleConvertToTask = async (id: string) => {
        await inboxToTask({ inboxItemId: id });
        await refresh();
    };

    return {
        handleArchive,
        handleSnooze,
        handleQuickComplete,
        handleConvertToTask
    };
}
