"use client";

import React, { useState } from "react";

export function PurchaseProposalCard(props: {
    proposal: {
        merchant_key: string;
        category: string;
        amount_cents?: number;
        currency?: string;
    };
    onPay: () => void;
    onDismiss: () => void;
}) {
    const [loading, setLoading] = useState(false);

    // Simple formatting
    const amount = props.proposal.amount_cents
        ? (props.proposal.amount_cents / 100).toLocaleString("en-US", {
            style: "currency",
            currency: props.proposal.currency || "USD",
        })
        : "Unknown Amount";

    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex justify-between text-xs opacity-70">
                <span>Proposal</span>
                <span>Secure Purchase</span>
            </div>

            <div className="mt-2 text-sm">
                <div className="font-medium text-white">{props.proposal.merchant_key}</div>
                <div className="opacity-80">{props.proposal.category} • {amount}</div>
            </div>

            <div className="mt-3 flex gap-2">
                <button
                    disabled={loading}
                    onClick={() => {
                        setLoading(true);
                        props.onPay();
                    }}
                    className="px-3 py-1 text-xs rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/30 hover:bg-emerald-500/30"
                >
                    {loading ? "Processing..." : "Pay now"}
                </button>

                <button
                    disabled={loading}
                    onClick={props.onDismiss}
                    className="px-3 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10"
                >
                    Dismiss
                </button>
            </div>

            <div className="mt-2 text-[10px] opacity-50">
                Virtual card will be issued for this exact amount.
            </div>
        </div>
    );
}
