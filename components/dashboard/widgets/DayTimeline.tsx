"use client";

const EVENTS = [
    { time: "09:00", title: "Team Sync", type: "meeting", status: "past" },
    { time: "10:00", title: "Deep Work Block", type: "focus", status: "active" },
    { time: "12:00", title: "Lunch Break", type: "break", status: "future" },
    { time: "13:00", title: "Client Call: Alpha", type: "meeting", status: "future" },
    { time: "14:30", title: "Project Review", type: "work", status: "future" },
];

export const DayTimeline = () => {
    return (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-zinc-800 bg-zinc-900/50">
                <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wide">Today's Agenda</h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {EVENTS.map((event, idx) => {
                    const isPassed = event.status === "past";
                    const isActive = event.status === "active";

                    return (
                        <div key={idx} className={`flex gap-4 ${isPassed ? 'opacity-40' : ''}`}>
                            <div className="flex flex-col items-end w-14 pt-0.5">
                                <span className={`text-sm font-mono ${isActive ? 'text-rose-500 font-bold' : 'text-zinc-500'}`}>
                                    {event.time}
                                </span>
                            </div>

                            <div className="relative flex flex-col pb-4 border-l border-zinc-800 pl-4 flex-1">
                                {isActive && (
                                    <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                                )}
                                {!isActive && !isPassed && (
                                    <div className="absolute -left-[3px] top-2 w-1.5 h-1.5 rounded-full bg-zinc-700" />
                                )}

                                <span className={`text-sm font-medium ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                                    {event.title}
                                </span>
                                <span className="text-xs text-zinc-500 capitalize mt-0.5">{event.type}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
