// Focus Pills - Horizontal pill cards for Today's Focus
// app/components/life-dashboard/FocusPills.tsx

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { colors } from "@/design-system";
import { Target, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/app/components/scenes/EmptyState";

interface DailyFocus {
  id: string;
  title: string;
  arcId?: string;
  questId?: string;
  arc?: {
    name: string;
    key: string;
  };
}

export function FocusPills() {
  const [focus, setFocus] = useState<DailyFocus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFocus();
  }, []);

  async function loadFocus() {
    try {
      const res = await fetch("/api/life-arc/autopilot/daily-focus");
      if (res.ok) {
        const data = await res.json();
        setFocus(data.focus || []);
      }
    } catch (err) {
      console.error("Failed to load daily focus:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex gap-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-12 w-32 rounded-full animate-pulse"
            style={{ background: colors.glass.subtle }}
          />
        ))}
      </div>
    );
  }

  if (focus.length === 0) {
    return (
      <div className="py-4">
        <EmptyState
          icon="✨"
          title="No focus items yet"
          description="Let's choose what matters most today."
          ctaLabel="Ask Productivity Coach"
          ctaAction={() => (window.location.href = "/coaches?coach=productivity")}
          sceneKey="life"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      {focus.slice(0, 5).map((item, index) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.1 }}
          whileHover={{ scale: 1.02, y: -2 }}
          className="group relative"
        >
          <div
            className="flex items-center gap-3 px-5 py-3 rounded-full border backdrop-blur-sm transition-all cursor-pointer"
            style={{
              background:
                index === 0
                  ? `linear-gradient(135deg, ${colors.accent.purple}20, ${colors.accent.pink}15)`
                  : colors.glass.panel,
              borderColor: index === 0 ? `${colors.accent.purple}40` : colors.border.glass,
              boxShadow: index === 0 ? "0 4px 12px rgba(139, 92, 246, 0.15)" : "none",
            }}
          >
            {index === 0 && (
              <motion.div
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Target className="w-4 h-4" style={{ color: colors.accent.purple }} />
              </motion.div>
            )}
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-medium"
                style={{ color: colors.text.primary }}
              >
                {item.title}
              </span>
              {item.arc && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{
                    background: `${colors.accent.purple}15`,
                    color: colors.accent.purple,
                    border: `1px solid ${colors.accent.purple}30`,
                  }}
                >
                  {item.arc.name}
                </span>
              )}
            </div>
            <ArrowRight
              className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: colors.text.secondary }}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}



