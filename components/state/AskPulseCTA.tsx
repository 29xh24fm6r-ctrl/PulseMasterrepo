"use client";

import Link from "next/link";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { MessageSquare } from "lucide-react";

export function AskPulseCTA() {
    return (
        <div className="flex justify-center mt-8">
            <Link href="/bridge">
                <SecondaryButton className="flex items-center gap-2 pl-4 pr-6">
                    <MessageSquare className="w-4 h-4" />
                    <span>Ask Pulse about this</span>
                </SecondaryButton>
            </Link>
        </div>
    );
}
