// Cockpit Widgets - Minimal contextual widgets
// components/realm/CockpitWidgets.tsx

"use client";

import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CockpitWidget } from "@/lib/realms/cockpit/types";
import { cockpitManager } from "@/lib/realms/cockpit/cockpit-manager";

export function CockpitWidgets() {
  const [widgets, setWidgets] = useState<CockpitWidget[]>([]);

  useEffect(() => {
    const unsubscribe = cockpitManager.subscribe((newWidgets) => {
      setWidgets(newWidgets);
    });

    return unsubscribe;
  }, []);

  const getPositionClasses = (position: CockpitWidget["position"]) => {
    switch (position) {
      case "top-left":
        return "top-6 left-6";
      case "top-right":
        return "top-6 right-6";
      case "bottom-left":
        return "bottom-6 left-6";
      case "bottom-right":
        return "bottom-6 right-6";
      case "center":
        return "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2";
      default:
        return "top-6 right-6";
    }
  };

  return (
    <>
      {widgets.map((widget) => (
        <motion.div
          key={widget.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={`absolute ${getPositionClasses(widget.position)} z-30`}
        >
          <div
            className="backdrop-blur-md bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm cursor-pointer hover:bg-white/15 transition-colors"
            onClick={widget.onClick}
          >
            <div className="font-medium">{widget.label}</div>
            {widget.value !== undefined && (
              <div className="text-xs text-white/70 mt-1">{widget.value}</div>
            )}
          </div>
        </motion.div>
      ))}
    </>
  );
}



