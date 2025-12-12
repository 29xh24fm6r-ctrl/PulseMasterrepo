// Universe Layout - Wrapper for 3D Universe with AGI features
// components/universe/UniverseLayout.tsx

"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { UniverseHUD } from "./UniverseHUD";
import { RealmPortal } from "./RealmPortal";
import { AGIIntentBar } from "./AGIIntentBar";
import { UniverseNodeConfig, getMostImportantNode, UNIVERSE_NODES } from "@/lib/universe/config";
import { getUniverseState, UniverseState, UniverseNodeMetrics } from "@/lib/universe/state";
import { AGIIntentType } from "@/lib/universe/intent";

// Dynamically import 3D scene (client-only, no SSR)
const UniverseScene = dynamic(
  () => import("./UniverseScene").then((mod) => ({ default: mod.UniverseScene })),
  {
    ssr: false,
    loading: () => (
      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 via-pink-900 to-blue-900">
        <div className="text-white text-xl">Loading your universe...</div>
      </div>
    ),
  }
);

type EmotionState = "calm" | "neutral" | "energized" | "stressed";

interface UniverseLayoutProps {
  children?: React.ReactNode;
  userName?: string;
  emotionState?: EmotionState;
  userId?: string;
}

export function UniverseLayout({
  children,
  userName,
  emotionState = "neutral",
  userId,
}: UniverseLayoutProps) {
  const router = useRouter();
  const [hoveredNode, setHoveredNode] = useState<UniverseNodeConfig | null>(null);
  const [selectedNode, setSelectedNode] = useState<UniverseNodeConfig | null>(null);
  const [universeState, setUniverseState] = useState<UniverseState | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Fetch universe state
  useEffect(() => {
    if (userId) {
      getUniverseState(userId)
        .then(setUniverseState)
        .catch((err) => {
          console.error("Failed to fetch universe state:", err);
          // Set default state on error
          const defaultState: UniverseState = {} as UniverseState;
          UNIVERSE_NODES.forEach((node) => {
            defaultState[node.id] = {
              importance: node.importance,
              urgency: 0.3,
              momentum: 0.5,
            };
          });
          setUniverseState(defaultState);
        });
    }
  }, [userId]);

  const handleNodeHover = (node: UniverseNodeConfig | null) => {
    setHoveredNode(node);
  };

  const handleNodeClick = (node: UniverseNodeConfig) => {
    setSelectedNode(node);
  };

  const handleSelectMostImportant = () => {
    const importantNode = getMostImportantNode();
    setSelectedNode(importantNode);
  };

  const handleDeselect = () => {
    setSelectedNode(null);
  };

  const handleEnterRealm = (node: UniverseNodeConfig) => {
    setIsTransitioning(true);
    
    // Cinematic transition: brief delay for particle effect
    setTimeout(() => {
      router.push(node.route);
    }, 300);
  };

  const handleIntent = (intentType: AGIIntentType, result: any) => {
    switch (intentType) {
      case "navigate_realm":
        if (result.targetRealm) {
          const node = UNIVERSE_NODES.find((n) => n.id === result.targetRealm);
          if (node) {
            setSelectedNode(node);
          }
        }
        break;
      case "suggest_focus":
        handleSelectMostImportant();
        break;
      default:
        // Other intents handled in AGIIntentBar
        break;
    }
  };

  const handleNavigateRealm = (realmId: string) => {
    const node = UNIVERSE_NODES.find((n) => n.id === realmId);
    if (node) {
      setSelectedNode(node);
    }
  };

  const handleSuggestFocus = () => {
    handleSelectMostImportant();
  };

  const getNodeMetrics = (nodeId: string): UniverseNodeMetrics | undefined => {
    return universeState?.[nodeId as keyof UniverseState];
  };

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* 3D Scene Background */}
      <UniverseScene
        emotionState={emotionState}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        selectedNodeId={selectedNode?.id}
        nodeMetrics={universeState || undefined}
      />

      {/* 2D HUD Overlay */}
      <UniverseHUD
        userName={userName}
        hoveredNode={hoveredNode}
        selectedNode={selectedNode}
        onSelectMostImportant={handleSelectMostImportant}
        onDeselect={handleDeselect}
      />

      {/* Realm Portal */}
      {selectedNode && (
        <RealmPortal
          node={selectedNode}
          metrics={getNodeMetrics(selectedNode.id) || {
            importance: selectedNode.importance,
            urgency: 0.3,
            momentum: 0.5,
          }}
          onEnter={() => handleEnterRealm(selectedNode)}
          onClose={handleDeselect}
          onAskPulse={() => {
            // TODO: Open coach/voice interface
            console.log("Ask Pulse about", selectedNode.id);
          }}
        />
      )}

      {/* AGI Intent Bar */}
      <AGIIntentBar
        onIntent={handleIntent}
        onNavigateRealm={handleNavigateRealm}
        onSuggestFocus={handleSuggestFocus}
      />

      {/* Transition Overlay */}
      {isTransitioning && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center">
          <div className="text-white text-2xl">Entering realm...</div>
        </div>
      )}

      {/* Children (if any) */}
      {children}
    </div>
  );
}
