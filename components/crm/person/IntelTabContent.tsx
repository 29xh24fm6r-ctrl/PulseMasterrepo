"use client";

import { useState, useCallback } from "react";
import { RunIntelButton } from "@/components/crm/RunIntelButton";
import { ContactIntelTab } from "./ContactIntelTab";

interface IntelTabContentProps {
  personId: string;
  onRunComplete?: () => void;
}

export function IntelTabContent({ personId, onRunComplete }: IntelTabContentProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRunComplete = useCallback(() => {
    // Trigger refresh by changing key
    setRefreshKey((k) => k + 1);
    onRunComplete?.();
  }, [onRunComplete]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">🕵️ Contact Intelligence</h3>
          <p className="text-sm text-gray-400">Brave Search + Pulse Agent Brief</p>
        </div>
        <RunIntelButton
          contactId={personId}
          variant="primary"
          onDone={handleRunComplete}
          onSwitchToIntel={() => {
            // Already on Intel tab, but ensure refresh happens
            handleRunComplete();
          }}
        />
      </div>
      <ContactIntelTab key={refreshKey} contactId={personId} />
    </div>
  );
}

