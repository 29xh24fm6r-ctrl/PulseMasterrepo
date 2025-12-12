"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Zap, Target, Heart, ArrowRight, X } from "lucide-react";
import { PulseCard } from "../ui/PulseCard";

interface WelcomeStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
}

const steps: WelcomeStep[] = [
  {
    id: "welcome",
    title: "Welcome to Pulse",
    description: "Your AI-powered Life Operating System. Pulse learns from you and helps you achieve more.",
    icon: <Sparkles className="w-12 h-12" />,
    gradient: "from-violet-500 to-pink-500",
  },
  {
    id: "power",
    title: "Unleash Your Potential",
    description: "Track your progress across all areas of life - work, relationships, wellness, and personal growth.",
    icon: <Zap className="w-12 h-12" />,
    gradient: "from-blue-500 to-violet-500",
  },
  {
    id: "focus",
    title: "Stay Focused",
    description: "Get intelligent insights and recommendations tailored to help you focus on what matters most.",
    icon: <Target className="w-12 h-12" />,
    gradient: "from-pink-500 to-orange-500",
  },
  {
    id: "ready",
    title: "You're All Set!",
    description: "Start exploring Pulse and let it help you become the best version of yourself.",
    icon: <Heart className="w-12 h-12" />,
    gradient: "from-violet-500 via-pink-500 to-orange-500",
  },
];

export function WelcomeFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem("pulse_onboarding_complete");
    if (!hasSeenOnboarding) {
      setIsVisible(true);
    }
  }, []);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem("pulse_onboarding_complete", "true");
    setIsVisible(false);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!isVisible) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={handleSkip}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl"
          >
            <PulseCard className="overflow-hidden">
              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-4 right-4 z-10 p-2 glass rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-zinc-400" />
              </button>

              {/* Progress bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-zinc-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                  className={`h-full bg-gradient-to-r ${step.gradient}`}
                />
              </div>

              {/* Content */}
              <div className="pt-12 pb-8 px-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="text-center"
                  >
                    {/* Icon */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                      className={`inline-flex p-6 rounded-3xl bg-gradient-to-br ${step.gradient} mb-6 text-white`}
                    >
                      {step.icon}
                    </motion.div>

                    {/* Title */}
                    <h2 className="text-3xl font-bold text-white mb-4">
                      {step.title}
                    </h2>

                    {/* Description */}
                    <p className="text-lg text-zinc-400 mb-8 max-w-md mx-auto">
                      {step.description}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Steps indicator */}
                <div className="flex justify-center gap-2 mb-8">
                  {steps.map((_, index) => (
                    <motion.div
                      key={index}
                      initial={false}
                      animate={{
                        scale: index === currentStep ? 1.2 : 1,
                        opacity: index <= currentStep ? 1 : 0.5,
                      }}
                      className={`h-2 rounded-full transition-all ${
                        index === currentStep
                          ? `w-8 bg-gradient-to-r ${step.gradient}`
                          : "w-2 bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  {currentStep > 0 && (
                    <button
                      onClick={() => setCurrentStep(currentStep - 1)}
                      className="px-6 py-3 glass rounded-xl hover:bg-white/10 transition-colors text-zinc-400 hover:text-white"
                    >
                      Back
                    </button>
                  )}
                  <div className="flex-1" />
                  <button
                    onClick={handleNext}
                    className={`px-8 py-3 bg-gradient-to-r ${step.gradient} rounded-xl font-medium text-white hover:opacity-90 transition-all hover:scale-105 flex items-center gap-2 shadow-lg shadow-violet-500/50`}
                  >
                    {currentStep === steps.length - 1 ? "Get Started" : "Next"}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </PulseCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

