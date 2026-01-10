"use client";

import { motion } from "framer-motion";

interface VitalGaugeProps {
    label: string;
    value: number; // 0-100
    color: string; // Hex or tailwind class
    icon?: React.ElementType;
}

export const VitalGauge = ({ label, value, color, icon: Icon }: VitalGaugeProps) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Background Ring */}
                <svg className="w-full h-full transform -rotate-90">
                    <circle
                        cx="50%"
                        cy="50%"
                        r={radius}
                        className="stroke-white/10 fill-none"
                        strokeWidth="6"
                    />
                    {/* Active Ring */}
                    <motion.circle
                        cx="50%"
                        cy="50%"
                        r={radius}
                        stroke={color}
                        strokeWidth="6"
                        strokeLinecap="round"
                        className="fill-none drop-shadow-glow"
                        initial={{ strokeDashoffset: circumference, strokeDasharray: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    />
                </svg>

                {/* Center Value/Icon */}
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                    <span className="text-xl font-bold text-white tracking-tighter">{value}%</span>
                    {Icon && <Icon className="w-3 h-3 text-white/50" />}
                </div>
            </div>
            <span className="text-xs uppercase tracking-widest text-white/50 font-medium">{label}</span>
        </div>
    );
};
