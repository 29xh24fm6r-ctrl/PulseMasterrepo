"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Home,
    Brain,
    MessageSquare,
    Settings,
    LogOut,
    Sparkles,
    Command
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UserButton } from "@clerk/nextjs";

export function PrimaryNav() {
    const pathname = usePathname();

    const navItems = [
        { label: "Bridge", href: "/bridge", icon: Home },
        { label: "Brain", href: "/intelligence", icon: Brain }, // Verified /intelligence is the likely target, can adjust if dead
        { label: "Chat", href: "/journal/chat", icon: MessageSquare }, // Using /journal/chat as it's the verified chat route
        { label: "Identity", href: "/bridge", icon: Sparkles }, // Shortcut to Identity on Bridge for now
    ];

    return (
        <div className="w-16 md:w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col h-screen sticky top-0">
            {/* Header */}
            <div className="h-16 flex items-center px-4 border-b border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 font-bold text-lg">
                    <Command className="w-6 h-6" />
                    <span className="hidden md:inline">Pulse</span>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 py-6 px-2 space-y-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                "hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100",
                                isActive
                                    ? "bg-violet-50 dark:bg-violet-900/10 text-violet-600 dark:text-violet-400"
                                    : "text-zinc-500 dark:text-zinc-400"
                            )}
                        >
                            <item.icon className="w-5 h-5 flex-shrink-0" />
                            <span className="hidden md:inline">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Footer / User Profile */}
            <div className="p-4 border-t border-zinc-100 dark:border-zinc-900">
                <div className="flex items-center gap-3">
                    <UserButton afterSignOutUrl="/" />
                    <div className="hidden md:block">
                        <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">My Profile</p>
                        <Link href="/settings" className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                            Settings
                        </Link>
                    </div>
                </div>
            </div>

            {/* Environment Banner for Beta */}
            <div className="md:hidden absolute bottom-0 w-full text-[10px] text-center text-zinc-300 py-1">
                BETA
            </div>
        </div>
    );
}
