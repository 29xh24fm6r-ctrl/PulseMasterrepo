"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from "framer-motion";
import {
    Home, Briefcase, Zap, Heart, Leaf, Trophy, Compass, Crown,
    Settings, User, Map, Search, Command, X, Menu, Box
} from "lucide-react";

// --- Navigation Data Structure ---
const NAV_CONSTELLATIONS = [
    {
        id: 'home',
        label: 'Home',
        href: '/home',
        icon: Home,
        color: 'from-violet-500 to-indigo-500',
        satellites: []
    },
    {
        id: 'productivity',
        label: 'Productivity',
        href: '/productivity',
        icon: Zap,
        color: 'from-amber-400 to-orange-500',
        satellites: [
            { href: "/productivity", label: "Flow Engine", icon: "⚡" },
            { href: "/tasks", label: "Tasks", icon: "✅" },
            { href: "/planner", label: "Day Planner", icon: "📅" },
            { href: "/pomodoro", label: "Focus Timer", icon: "🍅" },
            { href: "/goals", label: "Goals", icon: "🎯" },
        ]
    },
    {
        id: 'work',
        label: 'Work',
        href: '/work',
        icon: Briefcase,
        color: 'from-blue-400 to-cyan-500',
        satellites: [
            { href: "/work", label: "Work Queue", icon: "💼" },
            { href: "/deals", label: "Deals", icon: "💰" },
            { href: "/contacts", label: "Contacts", icon: "👥" },
            { href: "/follow-ups", label: "Follow-ups", icon: "📧" },
            { href: "/inbox", label: "Inbox", icon: "📥" },
        ]
    },
    {
        id: 'wellness',
        label: 'Wellness',
        href: '/wellness',
        icon: Heart,
        color: 'from-rose-400 to-pink-500',
        satellites: [
            { href: "/wellness", label: "Emotional Climate", icon: "🧘" },
            { href: "/emotions", label: "Emotions", icon: "😊" },
            { href: "/morning", label: "Morning Routine", icon: "🌅" },
            { href: "/journal", label: "Journal", icon: "📓" },
        ]
    },
    {
        id: 'growth',
        label: 'Growth',
        href: '/growth',
        icon: Leaf,
        color: 'from-emerald-400 to-green-500',
        satellites: [
            { href: "/growth", label: "The Dojo", icon: "✨" },
            { href: "/identity", label: "Identity", icon: "🔮" },
            { href: "/habits", label: "Habits", icon: "🔥" },
            { href: "/achievements", label: "Achievements", icon: "🏆" },
        ]
    },
    {
        id: 'strategy',
        label: 'Strategy',
        href: '/strategy',
        icon: Compass,
        color: 'from-purple-400 to-violet-500',
        satellites: [
            { href: "/strategy", label: "War Room", icon: "🧭" },
            { href: "/life-intelligence/simulation", label: "Simulations", icon: "🔮" },
            { href: "/goals", label: "Goals", icon: "🎯" },
            { href: "/intelligence", label: "Insights", icon: "💡" },
        ]
    },
    {
        id: 'coaches',
        label: 'Coaches',
        href: '/coaches',
        icon: Box, // Using generic Box as placeholder for Brain if needed
        color: 'from-fuchsia-400 to-pink-500',
        satellites: [
            { href: "/coaches", label: "All Coaches", icon: "🧠" },
            { href: "/career-coach", label: "Career", icon: "💼" },
            { href: "/call-coach", label: "Call Coach", icon: "📞" },
            { href: "/dojo", label: "Training Dojo", icon: "⚔️" },
        ]
    },
    {
        id: 'more',
        label: 'More',
        href: '/settings',
        icon: Settings,
        color: 'from-zinc-400 to-slate-500',
        satellites: [
            { href: "/xp", label: "XP", icon: "⚡" },
            { href: "/frontier", label: "Frontier", icon: "🚀" },
            { href: "/vault", label: "Vault", icon: "🔒" },
            { href: "/features", label: "Atlas", icon: "🗺️" },
            { href: "/settings", label: "Settings", icon: "⚙️" },
        ]
    }
];

const mouseX = useMotionValue(Infinity);
const pathname = usePathname();
// Silence Discipline (Fix 3): Hide in CLEAR state unless hovered nearby (logic could be complex, for now strict hide or minimize)
// Actually user said "Hide/Minimize Dock in CLEAR". Strict hide is safest for silence.
// Or we render a tiny "dot" or "handle". 
// Let's hide it completely for "Silence". User can use Cmd+K or mouse move could reveal?
// User said "Nothing needs you right now."
// Let's check context.
// But QuantumDock connects to global nav. If I hide it, user is stuck?
// User said "Dock visible... This is CLEAR state... CLEAR must be near-silent."
// "Hide/Minimize Dock in CLEAR".
// I will add a check: if CLEAR, render null.
// But wait, how do they navigate? "OrbitalMind" (Cmd+K).
// Or maybe "Minimize".
// I'll stick to Hiding it for now as per strict "Silence Discipline".

// Actually, I can't import useEncounter here easily if QuantumDock is outside EncounterContext?
// layout.tsx wraps everything in EncounterLayout -> EncounterProvider.
// So QuantumDock IS inside EncounterProvider.

// We need to import useEncounter.
// And handle the state.

// NOTE: I cannot use hooks conditionally. So I must move useEncounter up.

return <QuantumDockInner />;
}

import { useEncounter } from "@/components/encounter/EncounterContext";

function QuantumDockInner() {
    const { state } = useEncounter();
    const mouseX = useMotionValue(Infinity);
    const pathname = usePathname();

    if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up") || pathname === "/jarvis") {
        return null;
    }

    if (state === 'CLEAR') return null; // Silence Discipline

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <motion.div
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                className="flex items-end gap-3 px-4 py-3 bg-zinc-950/70 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 pointer-events-auto"
            >
                {NAV_CONSTELLATIONS.map((constellation) => (
                    <DockIcon
                        key={constellation.id}
                        mouseX={mouseX}
                        constellation={constellation}
                        isActive={pathname?.startsWith(constellation.href) && constellation.href !== '/' || pathname === constellation.href}
                    />
                ))}

                {/* Separator */}
                <div className="w-[1px] h-8 bg-white/10 mx-1" />

                {/* Global Actions */}
                <ActionIcon mouseX={mouseX} icon={Search} label="Search" shortcut="Cmd+K" />
                <Link href="/realtime-voice">
                    <ActionIcon mouseX={mouseX} icon={Crown} label="Voice" color="text-amber-400" />
                </Link>
            </motion.div>
        </div>
    );
}

function DockIcon({ mouseX, constellation, isActive }: { mouseX: any, constellation: any, isActive: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const [isHovered, setIsHovered] = useState(false);

    const distance = useTransform(mouseX, (val: number) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    const widthSync = useTransform(distance, [-150, 0, 150], [40, 80, 40]);
    const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

    return (
        <div className="relative group">
            {/* Satellite Stack (Sub-menu) */}
            <AnimatePresence>
                {isHovered && constellation.satellites.length > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 pb-2 flex flex-col items-center"
                    >
                        <div className="bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-xl min-w-[160px]">
                            {constellation.satellites.map((sat: any) => (
                                <Link
                                    key={sat.href}
                                    href={sat.href}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-colors text-sm whitespace-nowrap"
                                >
                                    <span className="text-base">{sat.icon}</span>
                                    <span>{sat.label}</span>
                                </Link>
                            ))}
                        </div>
                        {/* Arrow */}
                        <div className="w-3 h-3 bg-zinc-900/90 border-r border-b border-white/10 rotate-45 -mt-1.5" />
                    </motion.div>
                )}
            </AnimatePresence>

            <Link href={constellation.href}>
                <motion.div
                    ref={ref}
                    style={{ width }}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    className={`aspect-square rounded-2xl flex items-center justify-center relative transition-colors ${isActive ? "bg-white/10" : "bg-transparent hover:bg-white/5"
                        }`}
                >
                    <motion.div
                        className={`w-full h-full absolute inset-0 rounded-2xl opacity-20 bg-gradient-to-br ${constellation.color} blur-xl`}
                        animate={{ opacity: isActive ? 0.4 : 0 }}
                    />
                    <constellation.icon
                        className={`w-5 h-5 transition-colors ${isActive ? "text-white" : "text-zinc-400 group-hover:text-white"}`}
                    />

                    {/* Active Dot */}
                    {isActive && (
                        <div className="absolute -bottom-2 w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]" />
                    )}
                </motion.div>
            </Link>
        </div>
    );
}

function ActionIcon({ mouseX, icon: Icon, label, shortcut, color }: { mouseX: any, icon: any, label: string, shortcut?: string, color?: string }) {
    const ref = useRef<HTMLDivElement>(null);

    const distance = useTransform(mouseX, (val: number) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    const widthSync = useTransform(distance, [-150, 0, 150], [40, 60, 40]);
    const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 });

    return (
        <div className="relative group">
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 px-2 py-1 bg-zinc-900 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {label} {shortcut && <span className="text-zinc-500 ml-1">{shortcut}</span>}
            </div>

            <motion.div
                ref={ref}
                style={{ width }}
                className="aspect-square rounded-2xl flex items-center justify-center bg-transparent hover:bg-white/5 relative"
            >
                <Icon className={`w-5 h-5 ${color ? color : 'text-zinc-400 group-hover:text-white'} transition-colors`} />
            </motion.div>
        </div>
    );
}
