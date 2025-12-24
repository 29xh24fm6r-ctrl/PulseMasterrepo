"use client";

import React from "react";

export function RouteIdentityBadge({ id }: { id: string }) {
  return (
    <div className="fixed top-20 right-6 z-[9999] pointer-events-none">
      <div className="px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-950/70 backdrop-blur text-[11px] font-semibold text-zinc-200">
        ROUTE: {id}
      </div>
    </div>
  );
}

