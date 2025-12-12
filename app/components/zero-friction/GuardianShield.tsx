// Guardian Shield Component - Experience Ω
// app/components/zero-friction/GuardianShield.tsx

"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Heart } from "lucide-react";
import { GuardianState } from "@/lib/zero-friction/guardian-mode";
import { Button } from "@/components/ui/button";

export function GuardianShield() {
  const [state, setState] = useState<GuardianState | null>(null);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    checkGuardian();
    const interval = setInterval(checkGuardian, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, []);

  async function checkGuardian() {
    try {
      const res = await fetch("/api/zero-friction/guardian?check=true");
      if (res.ok) {
        const data = await res.json();
        setState(data.state);
        if (data.state.isActive && !showMessage) {
          setShowMessage(true);
          setTimeout(() => setShowMessage(false), 5000);
        }
      }
    } catch (err) {
      console.error("Failed to check guardian:", err);
    }
  }

  if (!state?.isActive) {
    return null;
  }

  return (
    <AnimatePresence>
      {showMessage && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed top-20 left-1/2 transform -translate-x-1/2 p-4 bg-surface2 rounded-lg border border-accent-cyan/50 shadow-lg z-50 max-w-md"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-accent-cyan" />
            <div className="flex-1">
              <div className="text-sm font-semibold text-text-primary mb-1">
                Guardian Mode Active
              </div>
              <div className="text-xs text-text-secondary">
                Pulse has simplified the interface to reduce overwhelm. Take your time.
              </div>
            </div>
            <button
              onClick={() => setShowMessage(false)}
              className="text-text-secondary hover:text-text-primary"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



