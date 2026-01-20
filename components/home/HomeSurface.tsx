"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasSeenFirstRun } from "@/lib/onboarding/firstRun";
import { LifeStateSnapshot } from "./LifeStateSnapshot";
import { OrientationLine } from "./OrientationLine";
import { HomeActions } from "./HomeActions";
import { usePulseRuntime } from "@/components/runtime/PulseRuntimeProvider";

export function HomeSurface() {
    const router = useRouter();
    const { lifeState } = usePulseRuntime();

    useEffect(() => {
        if (!hasSeenFirstRun()) {
            router.push('/welcome');
        }
    }, [router]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] w-full max-w-5xl mx-auto px-6 py-12">
            {/* Title / Greeting */}
            <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-16 tracking-tight">
                Good morning.
            </h1>

            {/* Life State Snapshot */}
            <LifeStateSnapshot state={lifeState} />

            {/* Orientation Line */}
            <OrientationLine message={lifeState.orientation} />

            {/* Actions */}
            <HomeActions />
        </div>
    );
}
