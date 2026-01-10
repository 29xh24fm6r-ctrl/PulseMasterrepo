"use client";

import { GlassCard } from "@/components/ui/premium/GlassCard";
import { CheckCircle2, Circle, Clock, Tag } from "lucide-react";
import { useHesitationTarget } from "@/hooks/useHesitationTarget";
import { motion } from "framer-motion";

interface Task {
    id: string;
    title: string;
    status: string;
    priority: string;
    tag: string;
    gravity_score?: number; // Optional until backend is fully hooked up
}

interface GravityTaskRowProps {
    task: Task;
    onToggle: (id: string) => void;
}

export function GravityTaskRow({ task, onToggle }: GravityTaskRowProps) {
    // 1. INSTRUMENTATION: This hook makes the component "Feel" the user's gaze for Gravity
    const hesitationSensors = useHesitationTarget(task.id);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            // 2. SENSORS ACTIVE: Attaching the telemetry handlers
            {...hesitationSensors}
        >
            <GlassCard className="flex items-center justify-between group hover:border-violet-500/50 transition-colors duration-500">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => onToggle(task.id)}
                        className={`transition-colors ${task.status === 'done' ? 'text-emerald-500' : 'text-zinc-600 hover:text-violet-400'}`}
                    >
                        {task.status === 'done' ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                    </button>

                    <div>
                        <h3 className={`font-medium transition-all ${task.status === 'done' ? 'text-zinc-600 line-through' : 'text-white'}`}>
                            {task.title}
                        </h3>

                        <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                            {/* Priority Badge */}
                            <span className={`px-1.5 py-0.5 rounded ${getPriorityColor(task.priority)} bg-opacity-10 text-white`}>
                                {task.priority}
                            </span>

                            <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" /> {task.tag}
                            </span>

                            {/* Gravity Indicator (Future Feature Visual) */}
                            {task.gravity_score && task.gravity_score > 10 && (
                                <span className="text-pink-500 flex items-center gap-1">
                                    v2.0
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    );
}

function getPriorityColor(priority: string) {
    switch (priority) {
        case 'High': return 'bg-red-500 text-red-200';
        case 'Medium': return 'bg-amber-500 text-amber-200';
        case 'Low': return 'bg-blue-500 text-blue-200';
        default: return 'bg-zinc-500';
    }
}
