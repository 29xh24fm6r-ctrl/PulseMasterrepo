// Life Graph Explorer
// app/(authenticated)/graph/page.tsx

"use client";

import { useState } from "react";
import { GraphSummaryCard } from "@/components/graph/GraphSummaryCard";
import { NodeExplorer } from "@/components/graph/NodeExplorer";
import { NodeDetailPanel } from "@/components/graph/NodeDetailPanel";
import { NeighborhoodGraph } from "@/components/graph/NeighborhoodGraph";
import { GraphInsightsCard } from "@/components/graph/GraphInsightsCard";

export default function GraphPage() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | undefined>();

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl md:text-3xl font-semibold text-white">Life Graph Explorer</h1>
        <p className="text-sm text-zinc-400">
          How Pulse sees relationships across your life.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr,2fr]">
        <div className="space-y-6">
          <GraphSummaryCard />
          <NodeExplorer
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
          <GraphInsightsCard />
        </div>

        <div className="space-y-6">
          <NodeDetailPanel nodeId={selectedNodeId} />
          <NeighborhoodGraph
            nodeId={selectedNodeId}
            onNeighborSelect={setSelectedNodeId}
          />
        </div>
      </div>
    </div>
  );
}




