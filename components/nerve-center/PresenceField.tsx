"use client";

import { motion } from "framer-motion";

const PEOPLE = [
    { name: "Alex K.", status: "msg", time: "10m" },
    { name: "Maria S.", status: "call", time: "1h" },
    { name: "Mom", status: "missed", time: "Yesterday" },
];

export const PresenceField = () => {
    return (
        <div className="flex items-center gap-8 pointer-events-auto">
            {PEOPLE.map((p, i) => (
                <div key={i} className="group relative flex flex-col items-center gap-3 cursor-pointer">

                    {/* The Avatar */}
                    <div className="relative">
                        {/* Signal Pulse (if active) */}
                        {p.status === 'msg' && (
                            <div className="absolute inset-0 rounded-full bg-blue-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                        )}
                        {p.status === 'missed' && (
                            <div className="absolute inset-0 rounded-full bg-red-500 blur-xl opacity-20 group-hover:opacity-40 transition-opacity animate-pulse" />
                        )}

                        <div className="w-14 h-14 rounded-full bg-zinc-900 ring-2 ring-zinc-800 group-hover:ring-zinc-600 transition-all flex items-center justify-center text-zinc-500 font-medium text-lg relative z-10 shadow-2xl">
                            {p.name.charAt(0)}
                        </div>

                        {/* Status Dot */}
                        {p.status === 'msg' && <div className="absolute top-0 right-0 w-3 h-3 bg-blue-500 rounded-full ring-2 ring-black z-20" />}
                        {p.status === 'missed' && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full ring-2 ring-black z-20" />}
                    </div>

                    {/* Name (Only visible on hover or if high signal) */}
                    <div className="flex flex-col items-center opacity-40 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs font-medium text-white tracking-wide uppercase">{p.name}</span>
                        <span className="text-[10px] text-zinc-500">{p.time}</span>
                    </div>
                </div>
            ))}

            {/* Add Button (Subtle) */}
            <button className="w-10 h-10 rounded-full border border-zinc-800 text-zinc-600 hover:text-white hover:border-zinc-600 flex items-center justify-center transition-all opacity-50 hover:opacity-100">
                +
            </button>
        </div>
    );
};
