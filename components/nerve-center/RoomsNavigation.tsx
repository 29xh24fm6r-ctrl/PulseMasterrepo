"use client";

import { motion } from "framer-motion";

const rooms = [
    { id: 'work', label: 'Work' },
    { id: 'people', label: 'People' },
    { id: 'life', label: 'Life' },
    { id: 'wealth', label: 'Wealth' },
    { id: 'health', label: 'Health' },
];

export const RoomsNavigation = () => {
    return (
        <nav className="flex justify-center items-center gap-12 py-10 relative z-20">
            {rooms.map((room) => (
                <button
                    key={room.id}
                    className="group relative flex flex-col items-center"
                >
                    <span className="text-sm font-medium text-zinc-500 group-hover:text-white transition-colors duration-500 uppercase tracking-widest">
                        {room.label}
                    </span>

                    {/* Active/Hover Indicator */}
                    <div className="absolute -bottom-2 w-1 h-1 bg-white/0 rounded-full group-hover:bg-white/50 transition-all duration-300" />
                </button>
            ))}
        </nav>
    );
};
