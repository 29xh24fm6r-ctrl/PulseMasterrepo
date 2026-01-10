'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Compass,
    LayoutGrid,
    Layers,
    Search,
    Settings,
    Sparkles,
    Zap,
    Mic
} from 'lucide-react';
import { useHesitationTarget } from '@/hooks/useHesitationTarget';
import { useHesitationContext } from '@/hooks/useHesitation';

const DOCK_ITEMS = [
    { id: 'dashboard', label: 'Home', icon: LayoutGrid, href: '/home' },
    { id: 'tasks', label: 'Tasks', icon: Zap, href: '/tasks' },
    { id: 'journal', label: 'Journal', icon: Compass, href: '/journal' },
    { id: 'pulse', label: 'Pulse', icon: Sparkles, href: '/intelligence' },
    { id: 'voice', label: 'Voice', icon: Mic, href: '/voice' },
];

export function SpatialDock() {
    const pathname = usePathname();
    const { signal } = useHesitationContext();
    const [isHovered, setIsHovered] = useState(false);

    // Instrument the dock as a Hesitation Target
    const dockInstrumentation = useHesitationTarget('spatial-dock');

    // "Eye Tracking Proxy" - If strict flow, shrink. If hesitation, expand.
    const isExpanded = isHovered || signal.state === 'STUCK' || signal.state === 'BROWSING';

    return (
        <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            {...dockInstrumentation}
            onMouseEnter={() => {
                dockInstrumentation.onMouseEnter();
                setIsHovered(true);
            }}
            onMouseLeave={() => {
                dockInstrumentation.onMouseLeave();
                setIsHovered(false);
            }}
        >
            <div
                className={`
          flex items-center gap-2 px-4 py-3 
          bg-zinc-950/80 backdrop-blur-xl 
          border border-white/10 rounded-full 
          shadow-2xl shadow-sky-500/5
          transition-all duration-500 ease-out
          ${isExpanded ? 'scale-110 px-6' : 'scale-100'}
        `}
            >
                {DOCK_ITEMS.map((item) => {
                    const isActive = pathname?.startsWith(item.href);
                    const Icon = item.icon;

                    return (
                        <Link
                            key={item.id}
                            href={item.href}
                            className="relative group"
                        >
                            <div
                                className={`
                  p-2.5 rounded-full transition-all duration-300
                  ${isActive
                                        ? 'bg-white/10 text-cyan-400'
                                        : 'text-zinc-400 hover:text-white hover:bg-white/5'}
                `}
                            >
                                <Icon size={20} />

                                {/* Active Indicator */}
                                {isActive && (
                                    <motion.div
                                        layoutId="active-pill"
                                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"
                                    />
                                )}

                                {/* Tooltip (visible only on hover) */}
                                <span className="
                  absolute -top-10 left-1/2 -translate-x-1/2 
                  px-2 py-1 bg-zinc-900 border border-white/10 rounded-lg 
                  text-[10px] text-white opacity-0 group-hover:opacity-100 
                  transition-opacity pointer-events-none whitespace-nowrap
                ">
                                    {item.label}
                                </span>
                            </div>
                        </Link>
                    );
                })}

                {/* Divider */}
                <div className="w-px h-6 bg-white/10 mx-1" />

                {/* Pulse Command Button */}
                <button
                    className="
            p-2.5 rounded-full bg-cyan-500/20 text-cyan-400 
            hover:bg-cyan-500/30 transition-colors
            border border-cyan-500/30
          "
                >
                    <Search size={20} />
                </button>
            </div>
        </motion.div>
    );
}
