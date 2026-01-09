"use client";

import { Search, Filter, Plus } from "lucide-react";

interface PageHeaderProps {
    title: string;
    subtitle: string;
    searchPlaceholder?: string;
    onSearch?: (query: string) => void;
    onAdd?: () => void;
    actionLabel?: string;
}

export function PageHeader({
    title,
    subtitle,
    searchPlaceholder = "Search...",
    onSearch,
    onAdd,
    actionLabel = "Add Item"
}: PageHeaderProps) {
    return (
        <div className="sticky top-14 z-20 bg-zinc-950/80 backdrop-blur-md border-b border-white/5 px-6 py-4">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
                        {title}
                    </h1>
                    <p className="text-sm text-zinc-400">{subtitle}</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-violet-400 transition-colors" />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            onChange={(e) => onSearch?.(e.target.value)}
                            className="pl-9 pr-4 py-2 bg-zinc-900 border border-white/5 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-violet-500/50 w-64 transition-all"
                        />
                    </div>

                    <button className="p-2 bg-zinc-900 border border-white/5 rounded-xl hover:bg-zinc-800 transition-colors">
                        <Filter className="w-4 h-4 text-zinc-400" />
                    </button>

                    {onAdd && (
                        <button
                            onClick={onAdd}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-violet-500/20"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{actionLabel}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
