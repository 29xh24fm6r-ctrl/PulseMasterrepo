// Connections Layer Panel
// app/components/master-dashboard/panels/ConnectionsLayerPanel.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassPanel } from "@/components/ui/pulse";
import { Button } from "@/components/ui/button";
import { Users, Heart, Bell } from "lucide-react";
import Link from "next/link";
import { colors } from "@/design-system";

interface ConnectionsLayerPanelProps {
  data: any;
}

export function ConnectionsLayerPanel({ data }: ConnectionsLayerPanelProps) {
  return (
    <GlassPanel hover elevation="z2" className="p-8 rounded-3xl h-full">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-7 h-7 text-pink-600" />
        <h2 className="text-2xl font-extrabold tracking-tight text-gray-900">Connections</h2>
      </div>

      <div className="space-y-6">
        {/* Relationship Pulses */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">Who to Check On</span>
            {data.relationshipAlerts > 0 && (
              <span className="px-2 py-1 rounded-full bg-pink-100 text-pink-600 text-xs font-semibold">
                {data.relationshipAlerts}
              </span>
            )}
          </div>
          <div className="space-y-2">
            {data.relationshipAlerts > 0 ? (
              <>
                <div className="p-3 rounded-lg bg-pink-50 flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-600" />
                  <span className="text-sm text-gray-700">2 people need attention</span>
                </div>
              </>
            ) : (
              <div className="p-3 rounded-lg bg-gray-50 text-center">
                <span className="text-sm text-gray-600">All relationships healthy</span>
              </div>
            )}
          </div>
        </div>

        {/* Social Energy Balance */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-pink-50 to-rose-50">
          <div className="text-xs text-gray-600 mb-2">Social Energy</div>
          <div className="text-2xl font-extrabold text-gray-900">Balanced</div>
        </div>

        {/* Open Loops */}
        <div>
          <div className="text-sm font-semibold text-gray-700 mb-2">Open Loops</div>
          <div className="p-3 rounded-lg bg-gray-50">
            <div className="text-sm text-gray-600">No pending follow-ups</div>
          </div>
        </div>

        {/* CTA */}
        <Button
          asChild
          size="lg"
          className="w-full font-semibold"
          style={{
            background: colors.scene.relationships.gradient,
            color: "white",
          }}
        >
          <Link href="/relationships">Open Connection Realm</Link>
        </Button>
      </div>
    </GlassPanel>
  );
}

