"use client";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { CurrentFocusCard } from "@/components/dashboard/widgets/CurrentFocusCard";
import { DayTimeline } from "@/components/dashboard/widgets/DayTimeline";
import { CriticalTaskList } from "@/components/dashboard/widgets/CriticalTaskList";
import { PeopleRow } from "@/components/dashboard/widgets/PeopleRow";

export const CommandCenter = () => {
    return (
        <DashboardShell>
            {/* 3-Column Grid for larger screens, stacking for smaller */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full max-w-[1600px] mx-auto">

                {/* COLUMN 1: Main (Focus & People) - Spans 7 cols */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    {/* Size: tall hero */}
                    <div className="flex-1 min-h-[300px]">
                        <CurrentFocusCard />
                    </div>
                    {/* Size: short row */}
                    <div className="h-[140px]">
                        <PeopleRow />
                    </div>
                </div>

                {/* COLUMN 2: Agenda (Timeline) - Spans 3 cols */}
                <div className="lg:col-span-3 h-full min-h-[400px]">
                    <DayTimeline />
                </div>

                {/* COLUMN 3: Must-Dos (Tasks) - Spans 2 cols */}
                <div className="lg:col-span-2 h-full min-h-[400px]">
                    <CriticalTaskList />
                </div>

            </div>
        </DashboardShell>
    );
};
