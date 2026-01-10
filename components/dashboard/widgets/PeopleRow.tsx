"use client";

import { MessageCircle, Phone, Video } from "lucide-react";

const PEOPLE = [
    { name: "Alex K.", status: "msg", time: "10m ago" },
    { name: "Maria S.", status: "call", time: "1h ago" },
    { name: "Team Lead", status: "none", time: "Online" },
    { name: "Mom", status: "missed", time: "Yesterday" },
];

export const PeopleRow = () => {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col justify-center">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide mb-3">Relevant People</h3>

            <div className="flex items-center gap-4 overflow-x-auto pb-2">
                {PEOPLE.map((p, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 min-w-[70px] cursor-pointer group">
                        <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-zinc-800 border border-zinc-700 group-hover:border-zinc-500 transition-colors flex items-center justify-center text-zinc-500 text-sm font-bold">
                                {p.name.charAt(0)}
                            </div>

                            {p.status === 'msg' && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-zinc-900 flex items-center justify-center text-white">
                                    <MessageCircle className="w-3 h-3" />
                                </div>
                            )}
                            {p.status === 'call' && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-zinc-900 flex items-center justify-center text-white">
                                    <Phone className="w-3 h-3" />
                                </div>
                            )}
                            {p.status === 'missed' && (
                                <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full border-2 border-zinc-900 flex items-center justify-center text-white">
                                    <Phone className="w-3 h-3" />
                                </div>
                            )}
                        </div>
                        <div className="text-center">
                            <div className="text-xs font-medium text-zinc-300 group-hover:text-white">{p.name}</div>
                            <div className="text-[10px] text-zinc-500">{p.time}</div>
                        </div>
                    </div>
                ))}

                <button className="w-10 h-10 rounded-full border border-dashed border-zinc-700 flex items-center justify-center text-zinc-500 hover:text-white hover:border-zinc-500 ml-2">
                    +
                </button>
            </div>
        </div>
    );
};
