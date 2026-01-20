"use client";

interface Invoice {
    id: string;
    date: string;
    amount: string;
    status: 'paid' | 'open';
}

const STUB_INVOICES: Invoice[] = [
    // { id: 'inv_1', date: '2025-12-01', amount: '$20.00', status: 'paid' } 
];

import { TOKENS } from "@/lib/ui/tokens";

export function InvoicesList() {
    const isEmpty = STUB_INVOICES.length === 0;

    return (
        <div className="mb-8">
            <h2 className={`text-xs font-semibold ${TOKENS.COLORS.text.dim} uppercase tracking-wider mb-4 px-2`}>
                Invoices
            </h2>
            <div className={`${TOKENS.COLORS.glass.bg} ${TOKENS.COLORS.glass.border} border ${TOKENS.RADIUS.md} overflow-hidden shadow-sm`}>
                {isEmpty ? (
                    <div className={`p-8 text-center ${TOKENS.COLORS.text.dim} text-sm`}>
                        No invoices yet.
                    </div>
                ) : (
                    <div className={`divide-y ${TOKENS.COLORS.glass.border}`}>
                        {STUB_INVOICES.map(inv => (
                            <div key={inv.id} className="flex items-center justify-between p-4">
                                <span className={`text-sm font-medium ${TOKENS.COLORS.text.body}`}>{inv.date}</span>
                                <div className="flex items-center gap-4">
                                    <span className={`text-sm ${TOKENS.COLORS.text.dim}`}>{inv.amount}</span>
                                    <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded capitalize">{inv.status}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
