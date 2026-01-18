"use client";

import React from "react";

export function InsightCard(props: {
    insight: {
        summary: string;
        confidence: number;
    };
    onDismiss: () => void;
}) {
    return (
        <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <div className="flex justify-between text-xs opacity-70">
                <span>Insight</span>
                <span>{Math.round(props.insight.confidence * 100)}% confidence</span>
            </div>

            <div className="mt-2 text-sm">{props.insight.summary}</div>

            <div className="mt-3">
                <button
                    onClick={props.onDismiss}
                    className="px-3 py-1 text-xs rounded-md bg-white/5 hover:bg-white/10"
                >
                    Okay
                </button>
            </div>
        </div>
    );
}
