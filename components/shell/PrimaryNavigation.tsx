"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Layout, ListTodo, Activity, MoreHorizontal, Eye, Settings, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { TOKENS } from "@/lib/ui/tokens";

export function PrimaryNavigation() {
    const pathname = usePathname();
    const [showMore, setShowMore] = useState(false);

    const navItems = [
        { label: "Home", href: "/", icon: Home },
        { label: "Bridge", href: "/bridge", icon: Layout },
        { label: "Plan", href: "/plan", icon: ListTodo },
        { label: "State", href: "/state", icon: Activity },
    ];

    const moreItems = [
        { label: "Observer", href: "/observer", icon: Eye },
        { label: "Settings", href: "/settings", icon: Settings },
        { label: "Billing", href: "/billing", icon: CreditCard },
    ];

    const NavLink = ({ item, mobile = false }: { item: any, mobile?: boolean }) => {
        const isActive = pathname === item.href;
        return (
            <Link
                href={item.href}
                className={cn(
                    "flex items-center justify-center lg:justify-start gap-4 p-3 mb-1 transition-all relative group",
                    TOKENS.RADIUS.sm,
                    isActive
                        ? "text-white bg-white/10 shadow-sm border border-white/5"
                        : `text-zinc-500 hover:text-zinc-300 hover:bg-white/5`
                )}
            >
                <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-violet-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                <span className={cn("text-sm font-medium", mobile ? "hidden" : "hidden lg:block")}>
                    {item.label}
                </span>
                {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-violet-500 rounded-r-full hidden lg:block shadow-[0_0_12px_rgba(139,92,246,0.5)]" />
                )}
            </Link>
        );
    };

    return (
        <>
            {/* Desktop Rail (Region C) */}
            <nav className={`hidden lg:flex flex-col w-72 border-r ${TOKENS.COLORS.glass.border} ${TOKENS.COLORS.glass.bg} ${TOKENS.BLUR.md} h-[calc(100vh-3.5rem)] shrink-0 py-6 px-4 gap-2`}>
                <div className="mb-2 px-3 text-xs font-medium text-zinc-600 uppercase tracking-widest">Menu</div>
                {navItems.map((item) => (
                    <NavLink key={item.href} item={item} />
                ))}

                <div className="mt-auto relative">
                    <div className="mb-2 px-3 text-xs font-medium text-zinc-600 uppercase tracking-widest">System</div>
                    {showMore && (
                        <div className={`absolute bottom-full left-0 w-full mb-3 ${TOKENS.COLORS.glass.bg} border border-white/10 ${TOKENS.RADIUS.md} shadow-2xl p-2 animate-in slide-in-from-bottom-2 fade-in backdrop-blur-xl`}>
                            {moreItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setShowMore(false)}
                                    className={`flex items-center gap-3 p-3 ${TOKENS.RADIUS.sm} hover:bg-white/5 text-zinc-400 hover:text-zinc-200 transition-colors`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span className="text-sm">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={() => setShowMore(!showMore)}
                        className={cn(
                            "w-full flex items-center justify-start gap-4 p-3 transition-colors",
                            TOKENS.RADIUS.sm,
                            showMore ? "bg-white/10 text-white" : "text-zinc-500 hover:bg-white/5 hover:text-zinc-300"
                        )}
                    >
                        <MoreHorizontal className="w-5 h-5" />
                        <span className="hidden lg:block text-sm font-medium">More</span>
                    </button>
                </div>
            </nav>

            {/* Mobile Dock (Region C) */}
            <nav className={`lg:hidden fixed bottom-0 left-0 right-0 ${TOKENS.COLORS.glass.bg} ${TOKENS.BLUR.lg} border-t ${TOKENS.COLORS.glass.border} h-20 flex items-center justify-around px-4 z-50 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]`}>
                {navItems.map((item) => (
                    <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                            "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all",
                            pathname === item.href ? "text-violet-400 scale-105" : "text-zinc-500"
                        )}
                    >
                        <item.icon className={cn("w-6 h-6", pathname === item.href && "drop-shadow-[0_0_8px_rgba(167,139,250,0.5)]")} />
                        <span className="text-[10px] font-medium tracking-wide">{item.label}</span>
                    </Link>
                ))}
                <button
                    onClick={() => setShowMore(!showMore)}
                    className={cn(
                        "flex flex-col items-center gap-1.5 p-2 rounded-xl relative transition-all",
                        showMore ? "text-violet-400" : "text-zinc-500"
                    )}
                >
                    <MoreHorizontal className="w-6 h-6" />
                    <span className="text-[10px] font-medium tracking-wide">More</span>
                    {showMore && (
                        <div className={`absolute bottom-full right-0 mb-6 w-56 ${TOKENS.COLORS.glass.bg} border border-white/10 ${TOKENS.RADIUS.lg} shadow-2xl p-2 z-50 backdrop-blur-xl`}>
                            {moreItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setShowMore(false)}
                                    className={`flex items-center gap-3 p-3 ${TOKENS.RADIUS.sm} hover:bg-white/5 text-zinc-400 hover:text-zinc-200`}
                                >
                                    <item.icon className="w-4 h-4" />
                                    <span className="text-sm">{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    )}
                </button>
            </nav>
        </>
    );
}
