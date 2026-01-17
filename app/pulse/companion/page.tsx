export const dynamic = "force-dynamic";

import React from "react";
import { PulseCompanionShell } from "@/components/companion/PulseCompanionShell";

export default function PulseCompanionPage() {
    return (
        <div className="min-h-dvh h-screen p-3 bg-slate-950">
            <PulseCompanionShell />
        </div>
    );
}
