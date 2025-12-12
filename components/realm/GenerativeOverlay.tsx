// Generative Overlay - Contextual overlay that appears on interaction
// components/realm/GenerativeOverlay.tsx

"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { OverlayConfig } from "@/lib/realms/generative-ui/types";
import { overlayManager } from "@/lib/realms/generative-ui/overlay-manager";
import { Button } from "@/components/ui/button";

export function GenerativeOverlay() {
  const [overlays, setOverlays] = useState<OverlayConfig[]>([]);

  useEffect(() => {
    const unsubscribe = overlayManager.subscribe((newOverlays) => {
      setOverlays(newOverlays);
    });

    return unsubscribe;
  }, []);

  return (
    <>
      {overlays.map((overlay) => (
        <OverlayItem key={overlay.id} overlay={overlay} />
      ))}
    </>
  );
}

function OverlayItem({ overlay }: { overlay: OverlayConfig }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (overlay.duration && overlay.duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => overlayManager.dismissOverlay(overlay.id), 300);
      }, overlay.duration);
      return () => clearTimeout(timer);
    }
  }, [overlay]);

  const handleDismiss = () => {
    if (overlay.dismissible) {
      setIsVisible(false);
      setTimeout(() => overlayManager.dismissOverlay(overlay.id), 300);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed z-50 pointer-events-auto"
          style={{
            left: `${overlay.position.x}px`,
            top: `${overlay.position.y}px`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="backdrop-blur-xl bg-white/15 border border-white/30 rounded-2xl shadow-2xl p-6 min-w-[300px] max-w-[400px]"
            style={{
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            {overlay.dismissible && (
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {overlay.content.title && (
              <h3 className="text-lg font-semibold text-white mb-2">{overlay.content.title}</h3>
            )}

            {overlay.content.description && (
              <p className="text-sm text-white/80 mb-4">{overlay.content.description}</p>
            )}

            {overlay.content.actions && overlay.content.actions.length > 0 && (
              <div className="flex gap-2 mt-4">
                {overlay.content.actions.map((action, index) => (
                  <Button
                    key={index}
                    onClick={action.action}
                    variant={action.variant === "danger" ? "destructive" : action.variant === "secondary" ? "outline" : "default"}
                    size="sm"
                    className="text-white"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}



