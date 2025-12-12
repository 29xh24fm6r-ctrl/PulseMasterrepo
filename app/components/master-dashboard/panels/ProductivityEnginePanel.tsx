// Productivity Engine Panel
// app/components/master-dashboard/panels/ProductivityEnginePanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/pulse";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle, TrendingUp } from "lucide-react";
import Link from "next/link";
import { colors } from "@/design-system";

interface ProductivityEnginePanelProps {
  data: any;
}

export function ProductivityEnginePanel({ data }: ProductivityEnginePanelProps) {
  return (
    <GlassPanel hover elevation="z2" className="p-8 rounded-3xl h-full">
      <div className="flex items-center gap-3 mb-6">
        <Zap className="w-7 h-7 text-cyan-600" />
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Productivity Engine</h2>
      </div>

      <div className="space-y-6">
        {/* Today Plan Snapshot */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Today's Plan</div>
          <div className="p-4 rounded-xl bg-cyan-50">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-cyan-600" />
              <span className="text-sm text-gray-700">AI-generated schedule ready</span>
            </div>
          </div>
        </div>

        {/* Task Load Meter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Task Load</span>
            <span className="text-lg font-bold text-cyan-600">{data.taskCount || 0}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: colors.accent.cyan }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((data.taskCount || 0) / 20 * 100, 100)}%` }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>
        </div>

        {/* Flow Score */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50">
          <div>
            <div className="text-xs text-gray-600 mb-1">Flow Score</div>
            <div className="text-2xl font-extrabold text-gray-900">{data.focusScore || 75}%</div>
          </div>
          <TrendingUp className="w-8 h-8 text-cyan-600" />
        </div>

        {/* Autopilot Status */}
        <div className="p-3 rounded-lg bg-gray-50">
          <div className="text-xs text-gray-600 mb-1">Autopilot</div>
          <div className="text-sm font-semibold text-gray-800">Active</div>
        </div>

        {/* CTA */}
        <Button
          asChild
          size="lg"
          className="w-full font-semibold"
          style={{
            background: colors.scene.productivity.gradient,
            color: "white",
          }}
        >
          <Link href="/productivity">Open Execution Engine</Link>
        </Button>
      </div>
    </GlassPanel>
  );
}

