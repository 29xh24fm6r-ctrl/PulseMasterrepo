"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Mail, MessageSquare, CheckSquare, Clock,
    Archive, Reply, ArrowRight, Phone,
    FileText, Zap, Search, Plus
} from "lucide-react";
import { useDigitalButler, useButlerActions } from "@/lib/hooks/use-digital-butler";
import { PreCogSidebar } from "@/components/ui/premium/PreCogSidebar";

export function DigitalButlerView() {
    const { inbox, deals, loading, refresh } = useDigitalButler();
    const { handleArchive, handleSnooze, handleQuickComplete, handleConvertToTask } = useButlerActions(refresh);
    const [activeTab, setActiveTab] = useState<"inbox" | "crm" | "tasks">("inbox");

    // Animation variants
    const containerVars = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVars = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    // 3D Tilt Effect Hardware Acceleration
    const holoTilt = {
        hover: {
            rotateX: 2,
            rotateY: -2,
            scale: 1.01,
            boxShadow: "0px 20px 50px rgba(127, 19, 236, 0.2)",
            transition: { type: "spring", stiffness: 300, damping: 20 }
        }
    };

    return (
        <div className="h-full flex flex-col gap-6 perspective-1000">

            {/* Butler Command Bar */}
            <div className="relative group">
                <div className="absolute inset-0 bg-[#7f13ec]/20 blur-xl rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative bg-white/5 backdrop-blur-2xl border border-white/10 p-1 pl-4 rounded-2xl flex items-center gap-3 shadow-2xl">
                    <Zap className="text-[#7f13ec] size-5" />
                    <input
                        type="text"
                        placeholder="Command the Butler... (e.g., 'Draft reply to Sarah', 'Reschedule sync')"
                        className="flex-1 bg-transparent border-none outline-none text-white placeholder-white/30 font-medium h-10"
                    />
                    <button className="bg-[#7f13ec] hover:bg-[#7f13ec]/80 text-white rounded-xl px-4 h-10 font-bold text-xs uppercase tracking-wider transition-all">
                        Execute
                    </button>
                </div>
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">

                {/* COL 1: The Meat Grinder (Unified Feed) */}
                <motion.div
                    variants={holoTilt}
                    whileHover="hover"
                    style={{ transformStyle: "preserve-3d" }}
                    className="col-span-12 lg:col-span-4 flex flex-col gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 overflow-hidden shadow-2xl relative group/card"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity" /> {/* Holo Shine */}
                    <div className="flex items-center justify-between pointer-events-none relative z-10">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                            <Mail className="size-4 text-white/70" /> Signal_Stream
                        </h3>
                        <span className="text-[10px] font-mono text-[#7f13ec] bg-[#7f13ec]/10 px-2 py-0.5 rounded border border-[#7f13ec]/20">
                            LIVE
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {loading ? (
                            <div className="text-center text-white/30 text-xs py-10 animate-pulse">Syncing Streams...</div>
                        ) : inbox.length === 0 ? (
                            <div className="text-center text-white/30 text-xs py-10">Inbox Zero. Systems Nominal.</div>
                        ) : (
                            inbox.map((item) => (
                                <motion.div
                                    key={item.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    className="group relative bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/20 p-4 rounded-xl transition-all cursor-pointer"
                                    onClick={() => setActiveTab("crm")} // Demo interaction
                                >
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {item.is_unread && <span className="size-2 rounded-full bg-[#7f13ec] shadow-[0_0_10px_#7f13ec]" />}
                                                <span className="text-xs font-bold text-white/70 truncate">{item.from_name || item.from_email}</span>
                                                <span className="text-[10px] text-white/30 ml-auto">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <h4 className="text-sm font-medium text-white mb-1 truncate">{item.subject}</h4>
                                            <p className="text-xs text-white/40 line-clamp-2">{item.snippet}</p>
                                        </div>
                                    </div>

                                    {/* Hover Actions */}
                                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex justify-end gap-2 translate-y-2 group-hover:translate-y-0 duration-300">
                                        <button onClick={(e) => { e.stopPropagation(); handleQuickComplete(item.id); }} className="p-2 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white transition-colors">
                                            <CheckSquare className="size-4" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleConvertToTask(item.id); }} className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white transition-colors">
                                            <ArrowRight className="size-4" />
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); handleArchive(item.id); }} className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors">
                                            <Archive className="size-4" />
                                        </button>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* COL 2: The War Room (CRM) */}
                <motion.div
                    variants={holoTilt}
                    whileHover="hover"
                    style={{ transformStyle: "preserve-3d" }}
                    className="col-span-12 lg:col-span-4 flex flex-col gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative group/card"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between pointer-events-none relative z-10">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                            <Phone className="size-4 text-white/70" /> War_Room
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-3">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => <div key={i} className="h-20 bg-white/5 animate-pulse rounded-xl" />)}
                            </div>
                        ) : deals.length === 0 ? (
                            <div className="text-center text-white/30 text-xs py-10">Pipeline Dormant.</div>
                        ) : (
                            deals.slice(0, 10).map((deal) => (
                                <div key={deal.id || Math.random()} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:border-[#7f13ec]/30 transition-all group cursor-pointer" onClick={() => setActiveTab("crm")}>
                                    <div className="flex items-center gap-3">
                                        <div className="size-8 rounded-full bg-gradient-to-br from-[#7f13ec] to-blue-600 flex items-center justify-center text-[10px] font-bold">
                                            {(deal.name?.[0] || "D").toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold">{deal.name}</div>
                                            <div className="text-xs text-white/40">{deal.stage || "Pipeline"} • ${(deal.value || 0).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <button className="opacity-0 group-hover:opacity-100 p-2 rounded-lg bg-white/10 hover:bg-[#7f13ec] transition-all">
                                        <MessageSquare className="size-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>

                {/* COL 3: Flight Plan (Tasks/Agenda) */}
                <motion.div
                    variants={holoTilt}
                    whileHover="hover"
                    style={{ transformStyle: "preserve-3d" }}
                    className="col-span-12 lg:col-span-4 flex flex-col gap-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl relative group/card"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none opacity-0 group-hover/card:opacity-100 transition-opacity" />
                    <div className="flex items-center justify-between pointer-events-none relative z-10">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-white/50 flex items-center gap-2">
                            <Clock className="size-4 text-white/70" /> Flight_Plan
                        </h3>
                        <button className="pointer-events-auto hover:text-white transition-colors">
                            <Plus className="size-4" />
                        </button>
                    </div>

                    <div className="flex-1 relative">
                        {/* Timeline Line */}
                        <div className="absolute left-4 top-0 bottom-0 w-px bg-white/10" />

                        <div className="space-y-6 pl-10 relative">
                            {/* Current Time Indicator */}
                            <div className="absolute left-[-5px] top-12 flex items-center gap-2">
                                <div className="size-2.5 bg-red-500 rounded-full shadow-[0_0_10px_red]" />
                                <div className="h-px w-8 bg-red-500/50" />
                            </div>

                            {[
                                { time: "09:00", label: "Deep Work Block", type: "event" },
                                { time: "11:30", label: "Team Sync", type: "meeting" },
                                { time: "14:00", label: "Client Calls", type: "call" },
                            ].map((slot, i) => (
                                <div key={i} className="relative group">
                                    <span className="absolute -left-10 text-[10px] font-mono text-white/30 top-1">{slot.time}</span>
                                    <div className="bg-white/5 border border-white/5 p-3 rounded-lg hover:border-white/20 transition-all">
                                        <div className="text-xs font-bold text-white/80">{slot.label}</div>
                                        <div className="text-[10px] text-white/40 uppercase tracking-wider">{slot.type}</div>
                                    </div>
                                </div>
                            ))}

                            <div className="mt-8 pt-4 border-t border-white/10">
                                <div className="text-[10px] font-bold uppercase text-white/30 mb-2">Priority Queue</div>
                                <div className="bg-[#7f13ec]/10 border border-[#7f13ec]/20 p-3 rounded-lg">
                                    <div className="text-xs font-bold text-[#7f13ec]">Review Q4 Strategy</div>
                                    <div className="text-[10px] text-white/40 mt-1">Due: Today 5pm</div>
                                </div>
                            </div>

                        </div>
                    </div>
                </motion.div>

            </div>

            {/* Pre-Cog Intelligence Sidebar */}
            <PreCogSidebar
                isOpen={activeTab === "crm"}
                onClose={() => setActiveTab("inbox")}
                contextQuery="Focus Context"
            />

        </div>
    );
}
