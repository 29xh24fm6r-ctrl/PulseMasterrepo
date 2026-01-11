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
        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all group ${active ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900'}`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
        <span className="text-sm font-medium">{label}</span>
    </Link>
);

export const CommandCenter = () => {
    const pathname = usePathname();

    return (
        <div className="flex h-screen w-full bg-[#050505] text-zinc-200 font-sans overflow-hidden selection:bg-amber-500/30">

            {/* COLUMN 1: SIDEBAR (Navigation) */}
            <aside className="w-64 border-r border-zinc-800 flex flex-col bg-[#050505] shrink-0">
                <div className="h-16 flex items-center px-6 border-b border-zinc-800/50">
                    <span className="font-bold text-lg tracking-tight text-white">Pulse</span>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    <NavItem icon={LayoutGrid} label="Dashboard" href="/" active={true} />
                    <NavItem icon={Calendar} label="Schedule" href="/schedule" />
                    <NavItem icon={List} label="Tasks" href="/tasks" />
                    <NavItem icon={Users} label="People" href="/people" />
                    <NavItem icon={BookOpen} label="Journal" href="/journal" />
                </nav>

                <div className="p-4 border-t border-zinc-800/50">
                    <NavItem icon={Settings} label="Settings" href="/settings" />
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* TOP BAR: Header */}
                <DashboardHeader />

                {/* WORKSPACE GRID */}
                <main className="flex-1 grid grid-cols-12 min-h-0">

                    {/* COLUMN 2: THE DESK (Work) - 8 Cols */}
                    <div className="col-span-8 h-full min-h-0 bg-[#050505]">
                        <TheDesk />
                    </div>

                    {/* COLUMN 3: THE STREAM (Awareness) - 4 Cols */}
                    <div className="col-span-4 h-full min-h-0">
                        <TheStream />
                    </div>

                </main>
            </div>

        </div>
    );
};
