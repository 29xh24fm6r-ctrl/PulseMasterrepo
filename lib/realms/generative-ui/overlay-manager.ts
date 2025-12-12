// Overlay Manager - Manages contextual overlays
// lib/realms/generative-ui/overlay-manager.ts

import { OverlayConfig, OverlayType, OverlayContent, OverlayState } from "./types";
import { SemanticNode } from "../node-engine/types";

export class OverlayManager {
  private overlays: OverlayConfig[] = [];
  private listeners: Array<(overlays: OverlayConfig[]) => void> = [];

  subscribe(listener: (overlays: OverlayConfig[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.overlays]));
  }

  showOverlay(config: Omit<OverlayConfig, "id">) {
    const overlay: OverlayConfig = {
      ...config,
      id: `overlay-${Date.now()}-${Math.random()}`,
      dismissible: config.dismissible !== false,
    };

    this.overlays.push(overlay);
    this.notify();

    // Auto-dismiss if duration is set
    if (config.duration) {
      setTimeout(() => {
        this.dismissOverlay(overlay.id);
      }, config.duration);
    }

    return overlay.id;
  }

  dismissOverlay(id: string) {
    this.overlays = this.overlays.filter((o) => o.id !== id);
    this.notify();
  }

  dismissAll() {
    this.overlays = [];
    this.notify();
  }

  getOverlays(): OverlayConfig[] {
    return [...this.overlays];
  }

  // Helper: Show node detail overlay
  showNodeDetail(node: SemanticNode, position: { x: number; y: number }) {
    return this.showOverlay({
      type: "detail",
      nodeId: node.id,
      position,
      content: {
        title: node.metadata.label,
        description: node.metadata.value?.toString() || "",
        data: node.metadata,
      },
      duration: 0, // No auto-dismiss
    });
  }

  // Helper: Show action overlay
  showAction(
    title: string,
    actions: OverlayConfig["content"]["actions"] | undefined,
    position: { x: number; y: number }
  ) {
    return this.showOverlay({
      type: "action",
      position,
      content: {
        title,
        actions: actions || [],
      },
      duration: 0,
    });
  }

  // Helper: Show insight overlay
  showInsight(message: string, position: { x: number; y: number }) {
    return this.showOverlay({
      type: "insight",
      position,
      content: {
        description: message,
      },
      duration: 5000, // Auto-dismiss after 5s
    });
  }

  // Helper: Show warning overlay
  showWarning(message: string, position: { x: number; y: number }) {
    return this.showOverlay({
      type: "warning",
      position,
      content: {
        title: "Warning",
        description: message,
      },
      duration: 7000,
    });
  }
}

export const overlayManager = new OverlayManager();

