import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { SecondaryButton } from "@/components/ui/SecondaryButton";
import { TOKENS } from "@/lib/ui/tokens";

interface WelcomeFooterProps {
    step: number;
    totalSteps: number;
    onBack: () => void;
    onNext: () => void;
    onStart: () => void;
    onSkip: () => void;
}

export function WelcomeFooter({ step, totalSteps, onBack, onNext, onStart, onSkip }: WelcomeFooterProps) {
    const isLastStep = step === totalSteps;

    return (
        <div className="mt-16 w-full max-w-sm mx-auto flex flex-col gap-4">
            {isLastStep ? (
                <>
                    <PrimaryButton
                        onClick={onStart}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        <Check className="w-5 h-5" />
                        <span>Start</span>
                    </PrimaryButton>
                    <button
                        onClick={onSkip}
                        className={`w-full text-center text-sm ${TOKENS.COLORS.text.dim} hover:text-white transition-colors`}
                    >
                        Skip for now
                    </button>
                </>
            ) : (
                <div className="flex items-center justify-between">
                    {step > 1 ? (
                        <button
                            onClick={onBack}
                            className={`flex items-center gap-2 ${TOKENS.COLORS.text.dim} hover:text-white px-4 py-2 transition-colors`}
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back
                        </button>
                    ) : (
                        <div /> /* Spacer */
                    )}

                    <PrimaryButton
                        onClick={onNext}
                        className="flex items-center gap-2"
                    >
                        Next
                        <ArrowRight className="w-4 h-4" />
                    </PrimaryButton>
                </div>
            )}

            {/* Progress Dots */}
            <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: totalSteps }).map((_, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            "w-2 h-2 rounded-full transition-all duration-300",
                            step === idx + 1
                                ? `bg-white w-4`
                                : `bg-zinc-800`
                        )}
                    />
                ))}
            </div>
        </div>
    );
}
