// Node Cluster 3D - Renders a cluster of nodes
// components/nodes/NodeCluster3D.tsx

"use client";

import React from "react";
import { SemanticNode3D } from "./SemanticNode3D";
import { NodeCluster } from "@/lib/realms/node-engine/types";

interface NodeCluster3DProps {
  cluster: NodeCluster;
  onNodeHover?: (node: any) => void;
  onNodeClick?: (node: any) => void;
}

export function NodeCluster3D({ cluster, onNodeHover, onNodeClick }: NodeCluster3DProps) {
  return (
    <group position={[cluster.center.x, cluster.center.y, cluster.center.z]}>
      {cluster.nodes.map((node) => (
        <SemanticNode3D
          key={node.id}
          node={node}
          onHover={onNodeHover}
          onClick={onNodeClick}
        />
      ))}
    </group>
  );
}



