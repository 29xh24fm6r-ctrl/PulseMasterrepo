"use client";

/**
 * Flash Moment - Delight overlay for meaningful moments
 * components/home/FlashMoment.tsx
 */

import { motion, AnimatePresence } from "framer-motion";

export function FlashMoment(props: { title: string; subtitle?: string; show: boolean }) {
  return (
    <AnimatePresence>
      {props.show && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 max-w-md w-[92%] shadow-2xl"
            initial={{ scale: 0.92, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.98, opacity: 0 }}
          >
            <div className="text-2xl font-bold text-white">{props.title}</div>
            {props.subtitle ? <div className="mt-2 text-zinc-300">{props.subtitle}</div> : null}
            <div className="mt-6 text-xs text-zinc-500">Flash is earned. Calm is default.</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

