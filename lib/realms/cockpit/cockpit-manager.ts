// Cockpit Manager - Manages minimal contextual widgets
// lib/realms/cockpit/cockpit-manager.ts

import { CockpitWidget, WidgetType, CockpitState } from "./types";

export class CockpitManager {
  private widgets: CockpitWidget[] = [];
  private listeners: Array<(widgets: CockpitWidget[]) => void> = [];

  subscribe(listener: (widgets: CockpitWidget[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => listener([...this.widgets]));
  }

  addWidget(widget: Omit<CockpitWidget, "id">) {
    const newWidget: CockpitWidget = {
      ...widget,
      id: `widget-${Date.now()}-${Math.random()}`,
    };
    this.widgets.push(newWidget);
    this.notify();
    return newWidget.id;
  }

  removeWidget(id: string) {
    this.widgets = this.widgets.filter((w) => w.id !== id);
    this.notify();
  }

  updateWidget(id: string, updates: Partial<CockpitWidget>) {
    const index = this.widgets.findIndex((w) => w.id === id);
    if (index !== -1) {
      this.widgets[index] = { ...this.widgets[index], ...updates };
      this.notify();
    }
  }

  getWidgets(): CockpitWidget[] {
    return this.widgets.filter((w) => w.visible);
  }

  // Helper: Add status widget
  addStatus(label: string, value: string | number, position: CockpitWidget["position"] = "top-right") {
    return this.addWidget({
      type: "status",
      label,
      value,
      position,
      visible: true,
    });
  }

  // Helper: Add quick action
  addQuickAction(label: string, onClick: () => void, position: CockpitWidget["position"] = "bottom-right") {
    return this.addWidget({
      type: "quick_action",
      label,
      position,
      onClick,
      visible: true,
    });
  }

  // Helper: Add indicator
  addIndicator(label: string, value: string | number, position: CockpitWidget["position"] = "top-left") {
    return this.addWidget({
      type: "indicator",
      label,
      value,
      position,
      visible: true,
    });
  }
}

export const cockpitManager = new CockpitManager();



