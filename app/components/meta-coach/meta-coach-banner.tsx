// Meta-Coach Banner Component
// app/components/meta-coach/meta-coach-banner.tsx

"use client";

import { useState } from "react";
import { AlertCircle, ArrowRight, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { InterventionModal } from "@/app/components/interventions/intervention-modal";

interface MetaCoachBannerProps {
  decision: {
    action: string;
    targetCoachId?: string;
    interventionKey?: string;
    reason: string;
  };
  onDismiss: () => void;
}

export function MetaCoachBanner({ decision, onDismiss }: MetaCoachBannerProps) {
  const router = useRouter();
  const [showIntervention, setShowIntervention] = useState(false);
  const [intervention, setIntervention] = useState<any>(null);

  async function handleAccept() {
    if (decision.action === "switch_coach" && decision.targetCoachId) {
      router.push(`/coaches/${decision.targetCoachId}`);
      onDismiss();
    } else if (decision.action === "trigger_intervention" && decision.interventionKey) {
      // Load intervention details
      try {
        const res = await fetch("/api/interventions/trigger", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            interventionKey: decision.interventionKey,
          }),
        });
        const data = await res.json();
        if (res.ok && data.intervention) {
          setIntervention(data.intervention);
          setShowIntervention(true);
        }
      } catch (err) {
        console.error("Failed to load intervention:", err);
      }
    }
  }

  async function handleInterventionComplete() {
    setShowIntervention(false);
    onDismiss();
  }

  if (decision.action === "stay_with_current_coach") {
    return null;
  }

  return (
    <>
      <div className="bg-amber-500/10 border border-amber-500/50 rounded-lg p-4 mb-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-amber-400">Meta-Coach Suggestion</h3>
              <button
                onClick={onDismiss}
                className="text-amber-400/50 hover:text-amber-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-zinc-300">{decision.reason}</p>
            <div className="flex gap-2">
              <button
                onClick={handleAccept}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded text-xs transition-colors"
              >
                {decision.action === "switch_coach" ? "Switch" : "Start"}
                <ArrowRight className="w-3 h-3" />
              </button>
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-zinc-400 hover:text-zinc-300 text-xs transition-colors"
              >
                Stay
              </button>
            </div>
          </div>
        </div>
      </div>

      {showIntervention && intervention && (
        <InterventionModal
          open={showIntervention}
          onOpenChange={setShowIntervention}
          intervention={intervention}
          onComplete={handleInterventionComplete}
        />
      )}
    </>
  );
}

