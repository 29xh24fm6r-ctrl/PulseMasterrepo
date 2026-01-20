"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface Column<T> {
    header: string;
    accessor: (item: T) => ReactNode;
    className?: string; // for width/alignment
}

interface ObserverTableProps<T> {
    columns: Column<T>[];
    data: T[];
    emptyMessage?: string;
}

import { TOKENS } from "@/lib/ui/tokens";

export function ObserverTable<T extends { id: string }>({ columns, data, emptyMessage = "No data available." }: ObserverTableProps<T>) {
    if (data.length === 0) {
        return (
            <div className={`p-8 text-center border border-dashed border-white/10 ${TOKENS.RADIUS.md} bg-white/5`}>
                <p className={`${TOKENS.COLORS.text.dim} text-sm`}>{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={`${TOKENS.COLORS.glass.bg} ${TOKENS.COLORS.glass.border} border ${TOKENS.RADIUS.md} overflow-hidden shadow-sm`}>
            <table className="w-full text-left text-sm">
                <thead className={`bg-white/5 border-b ${TOKENS.COLORS.glass.border}`}>
                    <tr>
                        {columns.map((col, idx) => (
                            <th
                                key={idx}
                                className={cn(`px-4 py-3 font-medium ${TOKENS.COLORS.text.dim} uppercase tracking-wider text-xs`, col.className)}
                            >
                                {col.header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className={`divide-y ${TOKENS.COLORS.glass.border}`}>
                    {data.map((item) => (
                        <tr key={item.id} className={`hover:bg-white/5 transition-colors`}>
                            {columns.map((col, idx) => (
                                <td key={idx} className={cn(`px-4 py-3 ${TOKENS.COLORS.text.body}`, col.className)}>
                                    {col.accessor(item)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
