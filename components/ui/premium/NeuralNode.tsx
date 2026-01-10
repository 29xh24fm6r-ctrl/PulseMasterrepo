"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Mail, Phone, Calendar, ArrowRight, Share2, MoreHorizontal } from "lucide-react";

// ============================================
// NEURAL NODE (LIQUID MENU)
// ============================================
// Takes a position and a set of actions. 
// Renders a central node and satellite nodes that "spring" out.

interface ActionNode {
    id: string;
    icon: any;
    label: string;
    angle: number; // Angle in degrees to project the node
}

interface NeuralNodeProps {
    isOpen: boolean;
    x: number;
    y: number;
    onClose: () => void;
    actions?: ActionNode[]; // Optional, defaults to generic set
}

const DEFAULT_ACTIONS: ActionNode[] = [
    { id: "email", icon: Mail, label: "Email", angle: 0 },
    { id: "call", icon: Phone, label: "Call", angle: 60 },
    { id: "schedule", icon: Calendar, label: "Schedule", angle: 120 },
    { id: "share", icon: Share2, label: "Share", angle: 180 },
    { id: "more", icon: MoreHorizontal, label: "More", angle: 240 },
    { id: "open", icon: ArrowRight, label: "Open", angle: 300 },
];

export function NeuralNode({ isOpen, x, y, onClose, actions = DEFAULT_ACTIONS }: NeuralNodeProps) {

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-[200] flex items-center justify-center"
                    style={{ pointerEvents: 'none' }} // Allow clicks to pass through empty space? No, usually we want a backdrop to close.
                >
                    {/* Backdrop - Invisible but catches clicks to close */}
                    <div
                        className="absolute inset-0 bg-transparent pointer-events-auto"
                        onClick={onClose}
                    />

                    {/* The Neural Cluster */}
                    <div
                        className="absolute pointer-events-none"
                        style={{ left: x, top: y }}
                    >

                        {/* Central Node (The Origin) */}
                        <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 20 }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-violet-600 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.6)] z-20 pointer-events-auto"
                        >
                            <div className="w-4 h-4 bg-white rounded-full animate-pulse" />
                        </motion.div>

                        {/* Satellite Nodes */}
                        {actions.map((action, i) => {
                            const radius = 80;
                            const angleRad = (action.angle * Math.PI) / 180;
                            const targetX = Math.cos(angleRad) * radius;
                            const targetY = Math.sin(angleRad) * radius;

                            return (
                                <motion.div
                                    key={action.id}
                                    initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                    animate={{ x: targetX, y: targetY, scale: 1, opacity: 1 }}
                                    exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 200,
                                        damping: 15,
                                        delay: i * 0.05
                                    }}
                                    className="absolute -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-auto cursor-pointer group"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        console.log(`🧠 Neural connection established: ${action.label}`);
                                        onClose();
                                    }}
                                >
                                    {/* The Node Button */}
                                    <div className="
                     w-12 h-12 bg-zinc-900 border border-white/10 rounded-full 
                     flex items-center justify-center 
                     shadow-lg hover:shadow-[0_0_20px_rgba(139,92,246,0.5)] hover:border-violet-500/50 hover:bg-zinc-800
                     transition-colors
                   ">
                                        <action.icon className="w-5 h-5 text-zinc-400 group-hover:text-violet-400" />
                                    </div>

                                    {/* Label (Only visible on hover) */}
                                    <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-white bg-black/50 px-2 py-1 rounded backdrop-blur-md pointer-events-none whitespace-nowrap">
                                        {action.label}
                                    </div>

                                    {/* Synapse Line (SVG) from Center to Node */}
                                    <svg className="absolute top-1/2 left-1/2 w-0 h-0 overflow-visible pointer-events-none -z-10">
                                        <line
                                            x1={-targetX}
                                            y1={-targetY}
                                            x2={0}
                                            y2={0}
                                            stroke="rgba(139, 92, 246, 0.2)"
                                            strokeWidth="1"
                                        />
                                    </svg>
                                </motion.div>
                            );
                        })}

                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
