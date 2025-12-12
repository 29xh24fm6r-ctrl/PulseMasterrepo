// Realm Engine - Main component that orchestrates the realm
// components/realm/RealmEngine.tsx

"use client";

import React, { useState, useEffect } from "react";
import { RealmState, RealmId } from "@/lib/realms/realm-engine/types";
import { buildRealmState } from "@/lib/realms/realm-engine/realm-builder";
import { classifyIntent, IntentResult } from "@/lib/realms/intent-engine/intent-classifier";
import { overlayManager } from "@/lib/realms/generative-ui/overlay-manager";
import { cockpitManager } from "@/lib/realms/cockpit/cockpit-manager";
import { RealmScene3D } from "./RealmScene3D";
import { GenerativeOverlay } from "./GenerativeOverlay";
import { CockpitWidgets } from "./CockpitWidgets";

interface RealmEngineProps {
  realmId: RealmId;
  userId: string;
  onIntent?: (intent: IntentResult) => void;
}

export function RealmEngine({ realmId, userId, onIntent }: RealmEngineProps) {
  const [realmState, setRealmState] = useState<RealmState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRealm() {
      try {
        const state = await buildRealmState(realmId, userId);
        setRealmState(state);

        // Initialize cockpit widgets
        cockpitManager.addStatus("Realm", realmId, "top-right");
        cockpitManager.addQuickAction("Voice", () => {
          // TODO: Open voice input
        }, "bottom-right");
      } catch (err) {
        console.error("Failed to load realm:", err);
      } finally {
        setLoading(false);
      }
    }

    loadRealm();
  }, [realmId, userId]);

  const handleNodeClick = (node: any) => {
    // Show overlay with node details
    overlayManager.showNodeDetail(node, {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
  };

  const handleNodeHover = (node: any) => {
    // Update realm state to highlight node
    if (realmState) {
      setRealmState({
        ...realmState,
        hoveredNodeId: node.id,
      });
    }
  };

  const handleIntent = (text: string) => {
    const intent = classifyIntent(text);
    onIntent?.(intent);

    // Execute intent
    switch (intent.action) {
      case "navigate_realm":
        // TODO: Navigate to realm
        break;
      case "focus_node":
        // TODO: Focus on node
        break;
      case "transform_realm":
        if (intent.transform && realmState) {
          // Apply transform
          setRealmState({
            ...realmState,
            atmosphere: {
              ...realmState.atmosphere,
              ...intent.transform.atmosphere,
            },
          });
        }
        break;
      case "show_overlay":
        if (intent.overlay) {
          overlayManager.showOverlay(intent.overlay);
        }
        break;
    }
  };

  if (loading || !realmState) {
    return (
      <div className="flex items-center justify-center h-full text-white">
        Loading realm...
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* 3D Scene */}
      <RealmScene3D
        realmState={realmState}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
      />

      {/* Generative Overlays */}
      <GenerativeOverlay />

      {/* Cockpit Widgets */}
      <CockpitWidgets />
    </div>
  );
}



