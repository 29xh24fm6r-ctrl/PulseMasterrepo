// Master Panels - World Overview Panels
// app/components/master-dashboard/MasterPanels.tsx

"use client";

import React from "react";
import { motion } from "framer-motion";
import { GlassPanel, GlowPanel } from "@/components/ui/pulse";
import { LifeSpherePanel } from "./panels/LifeSpherePanel";
import { ProductivityEnginePanel } from "./panels/ProductivityEnginePanel";
import { WorkSystemPanel } from "./panels/WorkSystemPanel";
import { GrowthChamberPanel } from "./panels/GrowthChamberPanel";
import { WellnessCorePanel } from "./panels/WellnessCorePanel";
import { ConnectionsLayerPanel } from "./panels/ConnectionsLayerPanel";

interface MasterPanelsProps {
  data: any;
}

export function MasterPanels({ data }: MasterPanelsProps) {
  return (
    <div id="master-panels" className="container mx-auto px-4 py-16 max-w-7xl">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="grid gap-8 md:grid-cols-2 lg:grid-cols-3"
      >
        {/* Panel 1: Life Sphere (Large - 2 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="md:col-span-2"
        >
          <LifeSpherePanel data={data} />
        </motion.div>

        {/* Panel 2: Productivity Engine */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <ProductivityEnginePanel data={data} />
        </motion.div>

        {/* Panel 3: Work System */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
        >
          <WorkSystemPanel data={data} />
        </motion.div>

        {/* Panel 4: Growth Chamber */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <GrowthChamberPanel data={data} />
        </motion.div>

        {/* Panel 5: Wellness Core */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
        >
          <WellnessCorePanel data={data} />
        </motion.div>

        {/* Panel 6: Connections Layer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6 }}
        >
          <ConnectionsLayerPanel data={data} />
        </motion.div>
      </motion.div>
    </div>
  );
}



