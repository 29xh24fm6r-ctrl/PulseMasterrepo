"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WelcomeStep } from "./WelcomeStep";
import { WelcomeFooter } from "./WelcomeFooter";
import { markFirstRunComplete } from "@/lib/onboarding/firstRun";
import { CheckCircle2, ShieldCheck, Zap } from "lucide-react";

export function WelcomeSurface() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const TOTAL_STEPS = 3;

    const handleNext = () => {
        if (step < TOTAL_STEPS) setStep(s => s + 1);
    };

    const handleBack = () => {
        if (step > 1) setStep(s => s - 1);
    };

    const handleStart = () => {
        markFirstRunComplete();
        router.push('/bridge');
    };

    const handleSkip = () => {
        markFirstRunComplete();
        router.push('/');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-black text-white">
            <div className="w-full max-w-2xl">

                {/* Step 1: Presence */}
                <WelcomeStep title="Welcome to Pulse" isActive={step === 1}>
                    <div className="flex justify-center mb-8">
                        <Zap className="w-16 h-16 text-violet-500" />
                    </div>
                    <p>
                        Pulse is a Life OS that helps you move through your day with less overwhelm.
                    </p>
                </WelcomeStep>

                {/* Step 2: Trust Contract */}
                <WelcomeStep title="You’re in control" isActive={step === 2}>
                    <div className="space-y-6 text-left max-w-sm mx-auto">
                        <div className="flex gap-4">
                            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                            <span>Pulse won’t overwhelm you with notifications.</span>
                        </div>
                        <div className="flex gap-4">
                            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                            <span>Pulse stays quiet when your energy is low or stress is high.</span>
                        </div>
                        <div className="flex gap-4">
                            <ShieldCheck className="w-6 h-6 text-emerald-500 shrink-0" />
                            <span>When Pulse takes action, you can always see why.</span>
                        </div>
                    </div>
                </WelcomeStep>

                {/* Step 3: Activation */}
                <WelcomeStep title="Try it now" isActive={step === 3}>
                    <div className="flex justify-center mb-8">
                        <CheckCircle2 className="w-16 h-16 text-zinc-900 dark:text-zinc-100" />
                    </div>
                    <p className="mb-8">
                        Tell Pulse what’s on your mind.
                    </p>
                </WelcomeStep>

                <WelcomeFooter
                    step={step}
                    totalSteps={TOTAL_STEPS}
                    onBack={handleBack}
                    onNext={handleNext}
                    onStart={handleStart}
                    onSkip={handleSkip}
                />
            </div>
        </div>
    );
}
