// CRM Alerts Panel
// app/components/crm/CrmAlertsPanel.tsx

"use client";

import { useState, useEffect } from "react";
import { AppCard } from "@/components/ui/AppCard";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

interface CrmAlert {
  id: string;
  type: string;
  title: string;
  body: string;
  severity: number;
  isPositive: boolean;
  contactId?: string;
  dealId?: string;
  createdAt: string;
  seenAt?: string;
  dismissedAt?: string;
}

export function CrmAlertsPanel() {
  const [alerts, setAlerts] = useState<CrmAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await fetch("/api/crm/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("Failed to load alerts:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markSeen(alertId: string) {
    try {
      await fetch(`/api/crm/alerts/${alertId}/seen`, { method: "POST" });
      loadAlerts();
    } catch (err) {
      console.error("Failed to mark alert as seen:", err);
    }
  }

  async function dismiss(alertId: string) {
    try {
      await fetch(`/api/crm/alerts/${alertId}/dismiss`, { method: "POST" });
      loadAlerts();
    } catch (err) {
      console.error("Failed to dismiss alert:", err);
    }
  }

  function getSeverityColor(severity: number, isPositive: boolean): string {
    if (isPositive) return "bg-green-600/20 text-green-400 border-green-600/30";
    if (severity >= 4) return "bg-red-600/20 text-red-400 border-red-600/30";
    if (severity >= 3) return "bg-orange-600/20 text-orange-400 border-orange-600/30";
    return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
  }

  const unreadAlerts = alerts.filter((a) => !a.seenAt && !a.dismissedAt);

  return (
    <AppCard
      title="CRM Alerts"
      description="Important updates about your relationships and deals"
    >
      {loading ? (
        <LoadingState message="Loading alerts…" />
      ) : alerts.length === 0 ? (
        <EmptyState
          title="No alerts"
          description="You're all caught up! Pulse will alert you when relationships or deals need attention."
        />
      ) : (
        <div className="space-y-3">
          {alerts.slice(0, 10).map((alert) => (
            <div
              key={alert.id}
              className={`p-3 rounded-lg border ${
                alert.seenAt || alert.dismissedAt
                  ? "bg-zinc-900/30 border-zinc-800/50 opacity-60"
                  : "bg-zinc-900/50 border-zinc-800"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1">
                  {alert.isPositive ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-white mb-1">{alert.title}</h4>
                    <p className="text-xs text-zinc-400">{alert.body}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Badge variant="outline" className={getSeverityColor(alert.severity, alert.isPositive)}>
                    {alert.severity}/5
                  </Badge>
                  {!alert.seenAt && !alert.dismissedAt && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => dismiss(alert.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppCard>
  );
}




