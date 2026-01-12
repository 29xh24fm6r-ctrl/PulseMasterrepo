"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutGrid, Calendar, Sun,
    CheckSquare, Users, BookOpen, Briefcase,
    Brain, Mic, MessageSquare,
    Settings, User, Lock
} from "lucide-react";

const SECTIONS = [
    {
        title: "Perspective",
        items: [
            { icon: LayoutGrid, label: "Dashboard", href: "/", color: "text-blue-400" },
            { icon: Calendar, label: "Schedule", href: "/schedule", color: "text-cyan-400" },
            { icon: Sun, label: "Today", href: "/today", color: "text-amber-400" },
        ]
    },
    {
        title: "Areas",
        items: [
            { icon: CheckSquare, label: "Tasks", href: "/tasks", color: "text-orange-400" },
            { icon: Users, label: "People", href: "/people", color: "text-teal-400" },
            { icon: BookOpen, label: "Journal", href: "/journal", color: "text-violet-400" },
            { icon: Briefcase, label: "Projects", href: "/projects", color: "text-indigo-400" },
        ]
    },
    {
        title: "Intelligence",
        items: [
            { icon: Brain, label: "Brain", href: "/second-brain" },
            { icon: Mic, label: "Voice", href: "/voice" },
            { icon: MessageSquare, label: "Chat", href: "/chat" },
        ]
    },
    {
        title: "System",
        items: [
            { icon: Settings, label: "Settings", href: "/settings" },
            { icon: User, label: "Profile", href: "/profile" },
        ]
    }
];

const NavItem = ({ icon: Icon, label, href, active, color }: any) => (
    <Link
        href={href}
        className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-all group ${active
            ? 'bg-blue-600 text-white shadow-sm font-medium'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
            }`}
    >
        <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
        {color && !active && <div className={`w-1 h-1 rounded-full ${color.replace('text-', 'bg-')} opacity-50`} />}
        <span className="text-[13px] tracking-wide leading-none pb-px">{label}</span>
    </Link>
);

export const Sidebar = () => {
    const pathname = usePathname();

    return (
        <aside className="w-[260px] h-screen flex flex-col shrink-0 border-r border-white/5 bg-black/20 backdrop-blur-3xl saturate-150 z-50">
            {/* TRAFFIC LIGHTS AREA */}
            <div className="h-14 flex items-center px-5 shrink-0">
                <div className="flex gap-2 group">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30 group-hover:bg-red-500 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/30 group-hover:bg-yellow-500 transition-colors" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/30 group-hover:bg-green-500 transition-colors" />
                </div>
            </div>

            {/* SCROLLABLE LIST */}
            <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6 scrollbar-hide">
                {SECTIONS.map((section, i) => (
                    <div key={i}>
                        <h3 className="px-3 mb-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest opacity-80">
                            {section.title}
                        </h3>
                        <div className="space-y-0.5">
                            {section.items.map((item, j) => (
                                <NavItem
                                    key={j}
                                    {...item}
                                    active={pathname === item.href}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </nav>

            {/* BOTTOM USER AREA */}
            <div className="p-4 border-t border-white/5 bg-black/10">
                <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 shadow-inner border border-white/10" />
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-zinc-300 group-hover:text-white">Marcus Paladino</span>
                        <span className="text-[10px] text-zinc-500">Pro Plan</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};
