"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { TheDesk } from "@/components/dashboard/TheDesk";
import { TheStream } from "@/components/dashboard/TheStream";
import { LayoutGrid, Calendar, Users, List, BookOpen, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Sidebar Item Component
const NavItem = ({ icon: Icon, label, href, active }: any) => (
    <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all group ${active ? 'bg-zinc-900 text-white border border-white/5 shadow-sm' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
    >
        <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
        <span className="text-xs font-medium tracking-wide">{label}</span>
    </Link>
);

export const CommandCenter = () => {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-full bg-zinc-950 text-zinc-200 font-sans overflow-hidden selection:bg-amber-500/30">

            {/* COLUMN 1: SIDEBAR (Navigation) */}
            <aside className="w-[240px] border-r border-white/5 flex flex-col bg-black/40 backdrop-blur-xl shrink-0 z-40">
                <div className="h-16 flex items-center px-6 border-b border-white/5">
                    <span className="font-bold text-sm tracking-tight text-white/90">PULSE</span>
                    <span className="ml-2 text-[9px] font-mono text-zinc-600 px-1 border border-white/5 rounded">OS v12.0</span>
                </div>

                <nav className="flex-1 p-3 space-y-1 mt-2">
                    <NavItem icon={LayoutGrid} label="Dashboard" href="/" active={true} />
                    <NavItem icon={Calendar} label="Schedule" href="/schedule" />
                    <NavItem icon={List} label="Tasks" href="/tasks" />
                    <NavItem icon={Users} label="People" href="/people" />
                    <NavItem icon={BookOpen} label="Journal" href="/journal" />
                </nav>

                <div className="p-3 border-t border-white/5">
                    <NavItem icon={Settings} label="System" href="/settings" />
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#09090b] relative">
                {/* Background Grid Pattern (Subtle) */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20" />

                {/* TOP BAR: Header */}
                <DashboardHeader />

                {/* WORKSPACE GRID */}
                <main className="flex-1 grid grid-cols-12 min-h-0 relative z-10">

                    {/* COLUMN 2: THE DESK (Work) - 8 Cols */}
                    <div className="col-span-8 h-full min-h-0">
                        <TheDesk />
                    </div>

                    {/* COLUMN 3: THE STREAM (Awareness) - 4 Cols */}
                    <div className="col-span-4 h-full min-h-0 border-l border-white/5 bg-black/20 backdrop-blur-sm">
                        <TheStream />
                    </div>

                </main>
            </div>

        </div>
    );
};
