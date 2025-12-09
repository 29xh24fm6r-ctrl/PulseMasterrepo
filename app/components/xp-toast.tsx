"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Sparkles, Flame, Zap, Trophy, Crown, Target } from "lucide-react";

// ============================================
// Types
// ============================================

type XPToast = {
  id: string;
  amount: number;
  category: "DXP" | "PXP" | "IXP" | "AXP" | "MXP";
  activity: string;
  wasCrit: boolean;
  critMultiplier?: number;
  visible: boolean;
};

type XPToastContextType = {
  showXPToast: (toast: Omit<XPToast, "id" | "visible">) => void;
};

// ============================================
// Context
// ============================================

const XPToastContext = createContext<XPToastContextType | null>(null);

export function useXPToast() {
  const context = useContext(XPToastContext);
  if (!context) {
    throw new Error("useXPToast must be used within XPToastProvider");
  }
  return context;
}

// ============================================
// Category Config
// ============================================

const CATEGORY_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string; label: string }> = {
  DXP: {
    icon: <Target className="w-4 h-4" />,
    color: "text-orange-400",
    bgColor: "from-orange-500/20 to-orange-600/10 border-orange-500/30",
    label: "Discipline",
  },
  PXP: {
    icon: <Crown className="w-4 h-4" />,
    color: "text-red-400",
    bgColor: "from-red-500/20 to-red-600/10 border-red-500/30",
    label: "Power",
  },
  IXP: {
    icon: <Sparkles className="w-4 h-4" />,
    color: "text-purple-400",
    bgColor: "from-purple-500/20 to-purple-600/10 border-purple-500/30",
    label: "Identity",
  },
  AXP: {
    icon: <Trophy className="w-4 h-4" />,
    color: "text-green-400",
    bgColor: "from-green-500/20 to-green-600/10 border-green-500/30",
    label: "Achievement",
  },
  MXP: {
    icon: <Flame className="w-4 h-4" />,
    color: "text-cyan-400",
    bgColor: "from-cyan-500/20 to-cyan-600/10 border-cyan-500/30",
    label: "Momentum",
  },
};

// ============================================
// Toast Component
// ============================================

function XPToastItem({ toast, onRemove }: { toast: XPToast; onRemove: (id: string) => void }) {
  const config = CATEGORY_CONFIG[toast.category] || CATEGORY_CONFIG.DXP;

  useEffect(() => {
    // Auto-remove after animation
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 3000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={`
        relative overflow-hidden
        flex items-center gap-3 px-4 py-3 rounded-xl
        bg-gradient-to-r ${config.bgColor} border backdrop-blur-sm
        shadow-lg shadow-black/20
        transform transition-all duration-500 ease-out
        ${toast.visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
        ${toast.wasCrit ? "animate-pulse" : ""}
      `}
    >
      {/* Crit glow effect */}
      {toast.wasCrit && (
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 animate-pulse" />
      )}

      {/* Icon */}
      <div className={`relative flex-shrink-0 ${config.color}`}>
        {config.icon}
        {toast.wasCrit && (
          <Zap className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 animate-bounce" />
        )}
      </div>

      {/* Content */}
      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-lg font-bold ${config.color}`}>
            +{toast.amount} {toast.category}
          </span>
          {toast.wasCrit && (
            <span className="px-1.5 py-0.5 text-xs font-bold bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30">
              {toast.critMultiplier}x CRIT!
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 truncate">{toast.activity}</p>
      </div>

      {/* Sparkle particles for crits */}
      {toast.wasCrit && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping"
              style={{
                left: `${20 + Math.random() * 60}%`,
                top: `${20 + Math.random() * 60}%`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: "1s",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Provider Component
// ============================================

export function XPToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<XPToast[]>([]);

  const showXPToast = useCallback((toast: Omit<XPToast, "id" | "visible">) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Add toast (invisible first)
    setToasts((prev) => [...prev, { ...toast, id, visible: false }]);

    // Make visible after a tick (for animation)
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, visible: true } : t))
      );
    }, 50);
  }, []);

  const removeToast = useCallback((id: string) => {
    // First hide it
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );

    // Then remove after animation
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 500);
  }, []);

  return (
    <XPToastContext.Provider value={{ showXPToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-24 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <XPToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </XPToastContext.Provider>
  );
}

// ============================================
// Standalone Toast Function (for non-React contexts)
// ============================================

let globalShowToast: ((toast: Omit<XPToast, "id" | "visible">) => void) | null = null;

export function setGlobalToastFunction(fn: typeof globalShowToast) {
  globalShowToast = fn;
}

export function showXPToastGlobal(toast: Omit<XPToast, "id" | "visible">) {
  if (globalShowToast) {
    globalShowToast(toast);
  } else {
    console.warn("XP Toast provider not mounted");
  }
}

// ============================================
// Helper Hook to Register Global Function
// ============================================

export function useRegisterGlobalToast() {
  const { showXPToast } = useXPToast();

  useEffect(() => {
    setGlobalToastFunction(showXPToast);
    return () => setGlobalToastFunction(null);
  }, [showXPToast]);
}
