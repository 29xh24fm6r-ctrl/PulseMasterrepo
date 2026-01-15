import React from 'react';

interface CommandBridgeLayoutProps {
    header?: React.ReactNode;
    trajectory?: React.ReactNode; // I3
    summary: React.ReactNode;
    signals: React.ReactNode;
    intelligence: React.ReactNode;
    trust: React.ReactNode;
    vectors: React.ReactNode;
}

export function CommandBridgeLayout({
    header,
    trajectory,
    summary,
    signals,
    intelligence,
    trust,
    vectors,
}: CommandBridgeLayoutProps) {
    return (
        <div className="w-full h-screen bg-[#050505] text-white flex flex-col overflow-hidden">

    /* 0. E3 Orientation Header */
            {header}
            {/* 0.1 I3 Trajectory Strip */}
            {trajectory}

            <div className="flex-1 p-6 grid grid-cols-12 grid-rows-12 gap-6 overflow-hidden">
                {/* 1. Life State Summary (Top Left) - 4 cols, 3 rows */}
                <div className="col-span-4 row-span-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl p-6 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    {summary}
                </div>

                {/* 2. Real-Time Signals (Top Right) - 8 cols, 3 rows */}
                <div className="col-span-8 row-span-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl p-6 relative group overflow-hidden flex items-center">
                    <div className="absolute inset-0 bg-gradient-to-bl from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    {signals}
                </div>

                {/* 3. Cross-Domain Intelligence Stream (Center) - 12 cols, 5 rows */}
                <div className="col-span-12 row-span-5 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl p-8 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    {intelligence}
                </div>

                {/* 4. Trust & Autonomy Meters (Bottom Left) - 5 cols, 4 rows */}
                <div className="col-span-5 row-span-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl p-6 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    {trust}
                </div>

                {/* 5. Opportunity & Pressure Vectors (Bottom Right) - 7 cols, 4 rows */}
                <div className="col-span-7 row-span-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-xl p-6 relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-tl from-rose-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                    {vectors}
                </div>
            </div>

        </div>
    );
}
