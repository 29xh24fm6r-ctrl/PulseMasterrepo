"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { usePathname } from "next/navigation";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  href?: string;
  onClick?: () => void;
  gradient: string;
}

const actions: QuickAction[] = [
  {
    id: "task",
    label: "New Task",
    icon: "✅",
    href: "/tasks/new",
    gradient: "from-violet-500 to-pink-500",
  },
  {
    id: "note",
    label: "Quick Note",
    icon: "📝",
    href: "/notes/new",
    gradient: "from-blue-500 to-violet-500",
  },
  {
    id: "goal",
    label: "New Goal",
    icon: "🎯",
    href: "/goals/new",
    gradient: "from-pink-500 to-orange-500",
  },
  {
    id: "event",
    label: "Add Event",
    icon: "📅",
    href: "/calendar/new",
    gradient: "from-violet-500 to-blue-500",
  },
];

export function QuickActions() {
  // DEPRECATED: This component is deprecated. Use Pulse shell FloatingActions instead.
  // Keeping for backward compatibility but should not be mounted globally.
  if (process.env.NODE_ENV !== "production") {
    console.warn("[QuickActions] DEPRECATED: QuickActions is deprecated. Use Pulse shell FloatingActions instead. This component should not be mounted globally.");
  }

  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Always hide - Pulse shell owns FABs now
  const pulseRoutes = ['/home', '/workspace', '/people', '/time', '/brain', '/decisions', '/loops', '/coaches', '/crm', '/productivity'];
  const isInPulseShell = pulseRoutes.some(route => pathname?.startsWith(route));

  // Hard-disable: always return null
  return null;

  /* Legacy code preserved but unreachable:
  return (
    <div className="fixed bottom-8 right-8 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 space-y-2"
          >
            {actions.map((action, index) => (
              <motion.a
                key={action.id}
                href={action.href}
                onClick={action.onClick}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex items-center gap-3 glass-strong px-4 py-3 rounded-xl hover:scale-105 transition-transform cursor-pointer bg-gradient-to-r ${action.gradient} bg-opacity-20 hover:bg-opacity-30 border border-white/20`}
              >
                <span className="text-xl">{action.icon}</span>
                <span className="font-medium text-white">{action.label}</span>
              </motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`w-14 h-14 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 shadow-lg shadow-violet-500/50 flex items-center justify-center text-white hover:shadow-xl hover:shadow-violet-500/70 transition-all ${
          isOpen ? "rotate-45" : ""
        }`}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <Plus className="w-6 h-6" />
        </motion.div>
      </motion.button>
    </div>
  );
  */
}

