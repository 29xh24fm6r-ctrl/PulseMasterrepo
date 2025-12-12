// Tour Overlay Component
// app/components/onboarding/TourOverlay.tsx

"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TourStep } from "@/lib/onboarding/tours";

interface TourOverlayProps {
  steps: TourStep[];
  onComplete: () => void;
  onSkip: () => void;
}

export function TourOverlay({ steps, onComplete, onSkip }: TourOverlayProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const step = steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === steps.length - 1;

  useEffect(() => {
    if (step.selector) {
      const element = document.querySelector(step.selector) as HTMLElement;
      if (element) {
        setHighlightedElement(element);
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        setHighlightedElement(null);
      }
    } else {
      setHighlightedElement(null);
    }
  }, [step.selector, currentStep]);

  function handleNext() {
    if (isLast) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  }

  function handleBack() {
    if (!isFirst) {
      setCurrentStep(currentStep - 1);
    }
  }

  function handleSkip() {
    onSkip();
  }

  return (
    <AnimatePresence>
      <motion.div
        ref={overlayRef}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 pointer-events-auto"
      >
        {/* Dimmed background */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Highlight overlay */}
        {highlightedElement && (
          <div
            className="absolute border-2 border-violet-500 rounded-lg pointer-events-none"
            style={{
              top: highlightedElement.offsetTop - 4,
              left: highlightedElement.offsetLeft - 4,
              width: highlightedElement.offsetWidth + 8,
              height: highlightedElement.offsetHeight + 8,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.5)",
            }}
          />
        )}

        {/* Tour dialog */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md"
        >
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{step.title}</h3>
                <p className="text-sm text-zinc-400">
                  Step {currentStep + 1} of {steps.length}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <p className="text-sm text-zinc-300 mb-6 leading-relaxed">{step.body}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {!isFirst && (
                  <Button variant="outline" size="sm" onClick={handleBack}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={handleSkip}>
                  Skip tour
                </Button>
              </div>
              <Button onClick={handleNext} className="bg-violet-600 hover:bg-violet-700">
                {isLast ? "Finish" : "Next"}
                {!isLast && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}




