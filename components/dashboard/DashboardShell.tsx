"use client";

import { ReactNode } from "react";
import { QuickActionBar } from "./QuickActionBar";
import { Home, Calendar, CheckSquare, Users, Book, Settings, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface DashboardShellProps {
    children: ReactNode;
}

const SIDEBAR_ITEMS = [
    { label: "Dashboard", icon: Home, path: "/" },
    { label: "Schedule", icon: Calendar, path: "/schedule" },
    { label: "Tasks", icon: CheckSquare, path: "/tasks" },
    { label: "People", icon: Users, path: "/people" }, // "Tribe" is good conceptually, but UI label can be People for clarity
    { label: "Journal", icon: Book, path: "/journal" },
];

export const DashboardShell = ({ children }: DashboardShellProps) => {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex font-sans selection:bg-rose-500/30">
            {/* SIDEBAR */}
            <aside className="w-16 md:w-64 border-r border-zinc-800 flex flex-col bg-zinc-950/50 flex-shrink-0">
                <div className="h-14 flex items-center justify-center md:justify-start md:px-6 border-b border-zinc-900">
                    <div className="w-6 h-6 bg-rose-600 rounded-sm flex-shrink-0" />
                    <span className="hidden md:block ml-3 font-bold text-lg tracking-tight">Pulse</span>
                </div>

                <nav className="flex-1 py-6 flex flex-col gap-1 px-2">
                    {SIDEBAR_ITEMS.map((item) => {
                        const isActive = pathname === item.path;
                        return (
                            <Link key={item.path} href={item.path} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}>
                                <item.icon className="w-5 h-5 flex-shrink-0" />
                                <span className="hidden md:block font-medium text-sm">{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-900">
                    <button className="flex items-center gap-3 px-3 py-2 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 w-full">
                        <Settings className="w-5 h-5 flex-shrink-0" />
                        <span className="hidden md:block font-medium text-sm">Settings</span>
                    </button>
                </div>
            </aside>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 flex flex-col h-screen overflow-hidden">
                {/* TOP BAR */}
                <header className="h-14 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between px-6 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button className="md:hidden text-zinc-400">
                            <Menu className="w-5 h-5" />
                        </button>
                        <h1 className="font-semibold text-zinc-100">Live Dashboard</h1>
                    </div>
                    <QuickActionBar />
                </header>

                {/* SCROLLABLE GRID */}
                <div className="flex-1 overflow-auto p-4 md:p-6">
                    {children}
                </div>
            </main>
        </div>
    );
};
