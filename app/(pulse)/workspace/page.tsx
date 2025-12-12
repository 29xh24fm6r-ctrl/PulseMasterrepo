"use client";

/**
 * Workspace Surface - Active Self
 * app/(pulse)/workspace/page.tsx
 */

import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import type { WorkspaceSurfacePayload, SurfaceMode } from "@/lib/surfaces/types";
import { WorkspaceRail } from "@/components/workspace/WorkspaceRail";
import { RealityStream } from "@/components/workspace/RealityStream";
import { ContextMind } from "@/components/workspace/ContextMind";

export default function WorkspacePage() {
  const { isLoaded, userId } = useAuth();
  const [mode, setMode] = useState<SurfaceMode>("now");
  const [data, setData] = useState<WorkspaceSurfacePayload | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) return;

    fetch(`/api/surfaces/workspace?mode=${mode}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
  }, [isLoaded, userId, mode]);

  const selected = useMemo(() => {
    // v1: payload includes a default selected. v2: fetch by selectedId, hydrate context mind with organism.
    return data?.selected;
  }, [data, selectedId]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-white">
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-2">
          <WorkspaceRail mode={mode} onMode={(m) => setMode(m)} />
        </div>

        <div className="lg:col-span-7">
          <RealityStream
            items={data?.stream || []}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>

        <div className="lg:col-span-3">
          <ContextMind 
            data={selected} 
            entityId={selectedId ? selectedId.split("-").slice(1).join("-") : null}
            entityType={selectedId?.startsWith("deal-") ? "deal" : selectedId?.startsWith("contact-") ? "contact" : selectedId?.startsWith("org-") ? "org" : undefined}
          />
        </div>
      </div>
    </div>
  );
}

