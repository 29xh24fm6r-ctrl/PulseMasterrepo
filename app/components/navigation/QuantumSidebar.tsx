// Quantum Navigation System - Cortex-Aware Sidebar
// app/components/navigation/QuantumSidebar.tsx

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  Briefcase,
  Heart,
  Users,
  Target,
  Brain,
  Settings,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { colors } from "@/design-system/colors";

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  relevance?: number; // 0-1, how relevant this is right now
  hasAttention?: boolean; // Does this need attention?
}

interface QuantumSidebarProps {
  emotion?: string | null;
  energy?: number;
  activeDomain?: string;
}

export function QuantumSidebar({ emotion, energy, activeDomain }: QuantumSidebarProps) {
  const pathname = usePathname();
  const [relevance, setRelevance] = useState<Record<string, number>>({});

  // Calculate relevance based on context
  useEffect(() => {
    const relevanceMap: Record<string, number> = {
      canvas: pathname === "/canvas" ? 1 : 0.5,
      work: activeDomain === "work" ? 0.9 : 0.4,
      life: activeDomain === "life" ? 0.8 : 0.5,
      relationships: activeDomain === "relationships" ? 0.9 : 0.6,
      strategy: activeDomain === "strategy" ? 0.8 : 0.4,
      trace: 0.3,
      settings: 0.2,
    };

    // Boost relevance based on emotion/energy
    if (emotion === "stressed") {
      relevanceMap.life = Math.min(1, relevanceMap.life + 0.2);
    }
    if (energy && energy < 0.4) {
      relevanceMap.life = Math.min(1, relevanceMap.life + 0.2);
    }

    setRelevance(relevanceMap);
  }, [pathname, emotion, energy, activeDomain]);

  const navItems: NavItem[] = [
    { key: "canvas", label: "Today", href: "/canvas", icon: Home },
    { key: "work", label: "Work", href: "/work", icon: Briefcase },
    { key: "life", label: "Life", href: "/life", icon: Heart },
    { key: "relationships", label: "Relationships", href: "/relationships", icon: Users },
    { key: "strategy", label: "Strategy", href: "/strategy-board", icon: Target },
    { key: "trace", label: "Cortex Trace", href: "/cortex-trace", icon: Brain },
    { key: "settings", label: "Settings", href: "/settings", icon: Settings },
  ];

  const topRelevant = Object.entries(relevance)
    .sort((a, b) => b[1] - a[1])[0]?.[0];

  return (
    <nav className="fixed left-0 top-0 h-full w-20 bg-surface2 border-r border-border-default flex flex-col items-center py-6 z-30">
      {/* Butler Icon */}
      <motion.div
        className="mb-8 relative"
        animate={{
          scale: topRelevant === "canvas" ? [1, 1.1, 1] : 1,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-cyan to-accent-purple flex items-center justify-center">
          <Zap className="w-6 h-6 text-white" />
        </div>
        {topRelevant === "canvas" && (
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-accent-cyan"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </motion.div>

      {/* Nav Items */}
      <div className="flex flex-col gap-4 flex-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          const itemRelevance = relevance[item.key] || 0.5;
          const isTopRelevant = topRelevant === item.key;

          return (
            <Link key={item.key} href={item.href}>
              <motion.div
                className={cn(
                  "relative w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                  isActive
                    ? "bg-accent-blue text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface3"
                )}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon className="w-5 h-5" />

                {/* Relevance pulse ring */}
                {isTopRelevant && itemRelevance > 0.7 && (
                  <motion.div
                    className="absolute inset-0 rounded-lg border-2 border-accent-cyan"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.6, 0, 0.6],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}

                {/* Attention indicator */}
                {item.hasAttention && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-status-warning"
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}



