// Life Node Context - Shares active node state between 3D scene and HUD
// components/life3d/LifeNodeContext.tsx

"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";

export type LifeNodeId = "focus" | "emotion" | "growth" | null;

interface LifeNodeContextValue {
  activeNode: LifeNodeId;
  setActiveNode: (nodeId: LifeNodeId) => void;
}

const LifeNodeContext = createContext<LifeNodeContextValue | undefined>(undefined);

export function LifeNodeProvider({ children }: { children: ReactNode }) {
  const [activeNode, setActiveNode] = useState<LifeNodeId>(null);

  return (
    <LifeNodeContext.Provider value={{ activeNode, setActiveNode }}>
      {children}
    </LifeNodeContext.Provider>
  );
}

export function useLifeNode() {
  const context = useContext(LifeNodeContext);
  if (!context) {
    throw new Error("useLifeNode must be used within LifeNodeProvider");
  }
  return context;
}



