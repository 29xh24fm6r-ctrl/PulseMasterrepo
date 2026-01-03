"use client";

import * as React from "react";
import { InteractionsPanel } from "@/components/crm/InteractionsPanel";
import { FollowupsList } from "@/components/crm/FollowupsList";

type AnyObj = Record<string, any>;

function dispatch(contactId: string, evt: any) {
    const key = `__pulse_oracle_evt_${contactId}`;
    const fn = (window as any)[key];
    if (typeof fn === "function") fn(evt);
}

export function PulseEventBridge(props: {
    contactId: string;
    person: AnyObj;
    followups: AnyObj;
    interactions: AnyObj;
}) {
    const contactId = props.contactId;

    const followupItems = props.followups?.items ?? props.followups ?? [];
    const interactionItems = props.interactions?.items ?? props.interactions ?? [];

    return (
        <div className="grid gap-8 md:grid-cols-2">
            {/* Left Col: Interactions */}
            <div className="space-y-8">
                <section className="col-span-1">
                    <InteractionsPanel
                        contactId={contactId}
                        initial={interactionItems}
                        onPulse={(evt) => dispatch(contactId, evt)}
                    />
                </section>
            </div>

            {/* Right Col: Followups */}
            <div className="space-y-8">
                <section className="col-span-1 border border-gray-800 rounded-2xl p-4 bg-gray-900/30">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-200">Open Follow-ups</h2>
                    </div>
                    <FollowupsList
                        contactId={contactId}
                        followups={followupItems}
                        onPulse={(evt) => dispatch(contactId, evt)}
                    />
                </section>
            </div>
        </div>
    );
}
