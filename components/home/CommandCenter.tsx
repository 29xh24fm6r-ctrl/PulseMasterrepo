"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TheDesk } from "@/components/dashboard/TheDesk";
import { TheStream } from "@/components/dashboard/TheStream";
import { Sidebar } from "@/components/dashboard/Sidebar";

export const CommandCenter = () => {
    return (
        <div className="flex h-screen w-full bg-[#050505] text-zinc-200 font-sans overflow-hidden selection:bg-violet-500/30">

            {/* OPTIONAL: GLOBAL WALLPAPER MESH (Subtle) */}
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-zinc-950/0 to-zinc-950/0 pointer-events-none" />

            {/* COLUMN 1: NEW SIDEBAR (Source List) */}
            <Sidebar />

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 relative z-10">

                {/* TOP BAR: Header */}
                <DashboardHeader />

                {/* WORKSPACE GRID */}
                <main className="flex-1 grid grid-cols-12 min-h-0">

                    {/* COLUMN 2: THE DESK (Work) - 8 Cols */}
                    <div className="col-span-8 h-full min-h-0 bg-transparent">
                        <TheDesk />
                    </div>

                    {/* COLUMN 3: THE STREAM (Awareness) - 4 Cols */}
                    <div className="col-span-4 h-full min-h-0 border-l border-white/5 bg-black/10 backdrop-blur-sm">
                        <TheStream />
                    </div>

                </main>
            </div>

        </div>
    );
};
