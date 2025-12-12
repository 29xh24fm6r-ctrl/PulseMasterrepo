// Page Layout Component
// app/components/layout/Page.tsx

"use client";

import { ReactNode } from "react";

interface PageProps {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Page({ title, description, children, className }: PageProps) {
  return (
    <div className={`px-4 py-6 md:px-8 md:py-8 space-y-8 ${className || ""}`}>
      <header className="flex flex-col gap-2 mb-2">
        <h1 className="text-3xl font-semibold text-white">{title}</h1>
        {description && (
          <p className="text-sm text-zinc-400">{description}</p>
        )}
      </header>
      <div className="animate-fade-in">
        {children}
      </div>
    </div>
  );
}

