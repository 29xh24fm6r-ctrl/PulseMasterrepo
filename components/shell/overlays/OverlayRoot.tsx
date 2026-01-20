"use client";

import { IPPReplacement } from "./IPPReplacement";
import { ConfirmationModal } from "./ConfirmationModal";
import { SystemBanner } from "./SystemBanner";
import { ExplanationCard } from "./ExplanationCard";

export function OverlayRoot() {
    return (
        <>
            <IPPReplacement />
            <ConfirmationModal />
            <SystemBanner />
            <ExplanationCard />
        </>
    );
}
