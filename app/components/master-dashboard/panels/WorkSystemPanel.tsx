// Work System Panel
// app/components/master-dashboard/panels/WorkSystemPanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/pulse";
import { Button } from "@/components/ui/button";
import { Briefcase, DollarSign, Users, Calendar } from "lucide-react";
import Link from "next/link";
import { colors } from "@/design-system";

interface WorkSystemPanelProps {
  data: any;
}

export function WorkSystemPanel({ data }: WorkSystemPanelProps) {
  return (
    <GlassPanel hover elevation="z2" className="p-8 rounded-3xl h-full">
      <div className="flex items-center gap-3 mb-6">
        <Briefcase className="w-7 h-7 text-blue-600" />
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Work System</h2>
      </div>

      <div className="space-y-6">
        {/* Deal Pipeline */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-gray-700">Deal Pipeline</span>
            <span className="text-lg font-bold text-blue-600">{data.dealCount || 0}</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: colors.accent.blue }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min((data.dealCount || 0) / 10 * 100, 100)}%` }}
              transition={{ delay: 0.5, duration: 1 }}
            />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-blue-50 text-center">
            <DollarSign className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-xs text-gray-600">Revenue</div>
            <div className="text-lg font-bold text-gray-900">$0</div>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 text-center">
            <Users className="w-5 h-5 text-blue-600 mx-auto mb-1" />
            <div className="text-xs text-gray-600">Contacts</div>
            <div className="text-lg font-bold text-gray-900">0</div>
          </div>
        </div>

        {/* Meeting Readiness */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-semibold text-gray-700">Meeting Readiness</span>
          </div>
          <div className="text-2xl font-extrabold text-gray-900">85%</div>
        </div>

        {/* CTA */}
        <Button
          asChild
          size="lg"
          className="w-full font-semibold"
          style={{
            background: colors.scene.work.gradient,
            color: "white",
          }}
        >
          <Link href="/work">Open Work Hub</Link>
        </Button>
      </div>
    </GlassPanel>
  );
}

