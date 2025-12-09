"use client";

import React, { useState, useEffect, createContext, useContext, useCallback } from "react";
import { X, Check, Brain, Rocket, Handshake, AlertTriangle, Zap } from "lucide-react";
import { useAutonomy, AutonomyLevel } from "@/lib/use-autonomy";

// ============================================
// TYPES
// ============================================

type PendingAction = {
  id: string;
  domain: "tasks" | "email" | "deals" | "relationships" | "calendar" | "habits" | "journal" | "notifications";
  title: string;
  description: string;
  isHighStakes: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  autoExecuteIn?: number; // seconds until auto-execute (for copilot mode)
};

type ActionGateContextType = {
  requestAction: (action: Omit<PendingAction, "id">) => Promise<boolean>;
  checkAndExecute: (
    domain: PendingAction["domain"],
    action: () => void | Promise<void>,
    options?: {
      title?: string;
      description?: string;
      isHighStakes?: boolean;
    }
  ) => Promise<void>;
};

// ============================================
// CONTEXT
// ============================================

const ActionGateContext = createContext<ActionGateContextType | null>(null);

export function useActionGate() {
  const context = useContext(ActionGateContext);
  if (!context) {
    throw new Error("useActionGate must be used within ActionGateProvider");
  }
  return context;
}

// ============================================
// PROVIDER
// ============================================

export function ActionGateProvider({ children }: { children: React.ReactNode }) {
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const { settings, canAutoExecute, getLevelForDomain } = useAutonomy();

  // Countdown timer for auto-execute
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;

    const timer = setTimeout(() => {
      if (countdown === 1 && pendingAction) {
        // Auto-execute
        handleConfirm();
      } else {
        setCountdown(countdown - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleConfirm = async () => {
    if (!pendingAction) return;
    
    try {
      await pendingAction.onConfirm();
    } catch (e) {
      console.error("Action failed:", e);
    }
    
    setPendingAction(null);
    setCountdown(null);
  };

  const handleCancel = () => {
    if (pendingAction?.onCancel) {
      pendingAction.onCancel();
    }
    setPendingAction(null);
    setCountdown(null);
  };

  const requestAction = useCallback(async (action: Omit<PendingAction, "id">): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = `action-${Date.now()}`;
      
      setPendingAction({
        ...action,
        id,
        onConfirm: async () => {
          await action.onConfirm();
          resolve(true);
        },
        onCancel: () => {
          action.onCancel?.();
          resolve(false);
        },
      });

      // Set countdown for copilot mode on non-high-stakes actions
      const level = getLevelForDomain(action.domain);
      if (level === "copilot" && !action.isHighStakes && action.autoExecuteIn) {
        setCountdown(action.autoExecuteIn);
      }
    });
  }, [getLevelForDomain]);

  const checkAndExecute = useCallback(async (
    domain: PendingAction["domain"],
    action: () => void | Promise<void>,
    options: {
      title?: string;
      description?: string;
      isHighStakes?: boolean;
    } = {}
  ) => {
    const { title = "Confirm Action", description = "Pulse wants to perform an action", isHighStakes = false } = options;
    
    // Check if we can auto-execute
    if (canAutoExecute(domain, isHighStakes)) {
      await action();
      return;
    }

    // Otherwise, request confirmation
    await requestAction({
      domain,
      title,
      description,
      isHighStakes,
      onConfirm: action,
      autoExecuteIn: isHighStakes ? undefined : 10, // 10 second countdown for low-stakes
    });
  }, [canAutoExecute, requestAction]);

  const level = pendingAction ? getLevelForDomain(pendingAction.domain) : "jarvis";

  return (
    <ActionGateContext.Provider value={{ requestAction, checkAndExecute }}>
      {children}

      {/* Confirmation Modal */}
      {pendingAction && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-md w-full">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${
                  pendingAction.isHighStakes 
                    ? "bg-amber-500/20 text-amber-400" 
                    : "bg-purple-500/20 text-purple-400"
                }`}>
                  {pendingAction.isHighStakes ? (
                    <AlertTriangle className="w-6 h-6" />
                  ) : level === "copilot" ? (
                    <Handshake className="w-6 h-6" />
                  ) : (
                    <Brain className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{pendingAction.title}</h3>
                  <p className="text-xs text-slate-400">
                    {level === "copilot" ? "Co-Pilot Mode" : "Advisor Mode"} • {pendingAction.domain}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description */}
            <p className="text-slate-300 mb-6">
              {pendingAction.description}
            </p>

            {/* Countdown (for copilot low-stakes) */}
            {countdown !== null && countdown > 0 && (
              <div className="mb-4 p-3 bg-slate-800 rounded-xl">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Auto-executing in</span>
                  <span className="text-purple-400 font-mono font-bold">{countdown}s</span>
                </div>
                <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 transition-all duration-1000"
                    style={{ width: `${(countdown / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-800 text-slate-300 font-medium hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 ${
                  pendingAction.isHighStakes
                    ? "bg-amber-600 hover:bg-amber-500 text-white"
                    : "bg-purple-600 hover:bg-purple-500 text-white"
                }`}
              >
                <Check className="w-4 h-4" />
                Confirm
              </button>
            </div>

            {/* Tip */}
            <p className="mt-4 text-xs text-slate-500 text-center">
              {level === "copilot" 
                ? "Tip: Switch to Jarvis Mode in settings for full automation"
                : "Tip: Switch to Co-Pilot Mode for smart auto-approval"
              }
            </p>
          </div>
        </div>
      )}
    </ActionGateContext.Provider>
  );
}

// ============================================
// AUTONOMY INDICATOR COMPONENT
// ============================================

export function AutonomyIndicator({ className = "" }: { className?: string }) {
  const { settings, isInQuietHours } = useAutonomy();
  
  const levelConfig: Record<AutonomyLevel, { icon: React.ReactNode; color: string; label: string }> = {
    jarvis: { icon: <Rocket className="w-4 h-4" />, color: "text-purple-400", label: "Jarvis" },
    copilot: { icon: <Handshake className="w-4 h-4" />, color: "text-cyan-400", label: "Co-Pilot" },
    advisor: { icon: <Brain className="w-4 h-4" />, color: "text-amber-400", label: "Advisor" },
    zen: { icon: <Zap className="w-4 h-4" />, color: "text-green-400", label: "Zen" },
  };

  const config = levelConfig[settings.globalLevel];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 ${config.color}`}>
        {config.icon}
        <span className="text-xs font-medium">{config.label}</span>
      </div>
      {isInQuietHours() && (
        <span className="px-2 py-1 rounded-lg bg-slate-800 text-slate-500 text-xs">
          🌙 Quiet
        </span>
      )}
    </div>
  );
}
